"use strict";

const express = require("express");
const { admin, requireFirebaseUser } = require("../firebase-admin");
const { analyzeProgress } = require("../services/progress-analyzer");
const { generateQuestionBatch } = require("../services/question-generator");

const router = express.Router();
router.use(requireFirebaseUser);

async function readProgress(uid) {
  const ref = admin.firestore().doc(`users/${uid}/progress/overview`);
  const snapshot = await ref.get();
  return snapshot.exists ? (snapshot.data().progress || {}) : {};
}

async function saveQuizProfile(uid, patch) {
  const ref = admin.firestore().doc(`users/${uid}/adaptiveQuiz/profile`);
  await ref.set({ ...patch, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

router.post("/start", async (req, res, next) => {
  try {
    const progress = await readProgress(req.user.uid);
    const profile = analyzeProgress(progress);
    const prior = await admin.firestore().doc(`users/${req.user.uid}/adaptiveQuiz/profile`).get();
    const history = prior.exists ? (prior.data().questionHistory || []) : [];
    const questions = await generateQuestionBatch(profile, history);
    await saveQuizProfile(req.user.uid, { lastBatchTopics: questions.map(q => q.topic) });
    res.json({ success: true, count: 8, profile, questions });
  } catch (error) { next(error); }
});

router.post("/submit", async (req, res, next) => {
  try {
    const answers = req.body?.answers;
    const questions = req.body?.questions;
    if (!Array.isArray(answers) || !Array.isArray(questions) || answers.length !== 8 || questions.length !== 8) {
      return res.status(400).json({ error: "Submit the complete eight-question batch." });
    }
    const profileRef = admin.firestore().doc(`users/${req.user.uid}/adaptiveQuiz/profile`);
    const existing = await profileRef.get();
    const previous = existing.exists ? existing.data() : {};
    const performance = { ...(previous.topicPerformance || {}) };
    let correct = 0;
    const seen = new Set();
    for (let i = 0; i < 8; i++) {
      const q = questions[i];
      if (!q || typeof q.id !== "string" || !Array.isArray(q.options) || q.options.length !== 4 ||
          !Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3) {
        return res.status(400).json({ error: "Invalid question batch." });
      }
      const key = `${q.id}:${i}`;
      if (seen.has(key)) return res.status(400).json({ error: "Duplicate question identifier." });
      seen.add(key);
      const ok = Number(answers[i]) === q.correctAnswer;
      if (ok) correct++;
      const topic = String(q.topic || "Other");
      performance[topic] = performance[topic] || { attempts: 0, correct: 0 };
      performance[topic].attempts++;
      if (ok) performance[topic].correct++;
    }
    await saveQuizProfile(req.user.uid, {
      topicPerformance: performance,
      questionHistory: [...(previous.questionHistory || []), ...questions.map(q => q.question)].slice(-40),
      lastScore: Math.round(correct / 8 * 100),
      totalAttempts: (Number(previous.totalAttempts) || 0) + 8
    });
    res.json({ success: true, correct, total: 8, score: Math.round(correct / 8 * 100), topicPerformance: performance });
  } catch (error) { next(error); }
});

router.get("/profile", async (req, res, next) => {
  try {
    const progress = await readProgress(req.user.uid);
    const course = analyzeProgress(progress);
    const ref = await admin.firestore().doc(`users/${req.user.uid}/adaptiveQuiz/profile`).get();
    res.json({ success: true, course, adaptive: ref.exists ? ref.data() : {} });
  } catch (error) { next(error); }
});

module.exports = router;
