"use strict";

const express = require("express");
const { randomUUID } = require("node:crypto");
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

async function readAdaptiveProfile(uid) {
  const ref = admin.firestore().doc(`users/${uid}/adaptiveQuiz/profile`);
  const snapshot = await ref.get();
  return snapshot.exists ? snapshot.data() : {};
}

async function saveAdaptiveProfile(uid, patch) {
  const ref = admin.firestore().doc(`users/${uid}/adaptiveQuiz/profile`);
  await ref.set({ ...patch, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

router.post("/start", async (req, res, next) => {
  try {
    const [progress, adaptive] = await Promise.all([
      readProgress(req.user.uid),
      readAdaptiveProfile(req.user.uid)
    ]);
    progress.topicPerformance = adaptive.topicPerformance || {};
    const profile = analyzeProgress(progress);
    const history = adaptive.questionHistory || [];
    const generated = await generateQuestionBatch(profile, history);
    const sessionId = randomUUID();
    const sessionRef = admin.firestore().doc(`users/${req.user.uid}/adaptiveQuiz/sessions/${sessionId}`);
    await sessionRef.set({
      questions: generated,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "open"
    });
    const questions = generated.map(({ correctAnswer, explanation, ...question }) => question);
    res.json({ success: true, sessionId, count: 8, profile, questions });
  } catch (error) { next(error); }
});

router.post("/submit", async (req, res, next) => {
  try {
    const { sessionId, answers } = req.body || {};
    if (typeof sessionId !== "string" || !/^[0-9a-f-]{36}$/i.test(sessionId) ||
        !Array.isArray(answers) || answers.length !== 8 ||
        answers.some(value => !Number.isInteger(value) || value < -1 || value > 3)) {
      return res.status(400).json({ error: "Submit one option index for each of the eight questions." });
    }
    const sessionRef = admin.firestore().doc(`users/${req.user.uid}/adaptiveQuiz/sessions/${sessionId}`);
    const sessionSnapshot = await sessionRef.get();
    if (!sessionSnapshot.exists || sessionSnapshot.data().status !== "open") {
      return res.status(404).json({ error: "Quiz session not found or already submitted." });
    }
    const questions = sessionSnapshot.data().questions;
    if (!Array.isArray(questions) || questions.length !== 8) {
      return res.status(500).json({ error: "Stored quiz session is invalid." });
    }

    let correct = 0;
    const topicPerformance = { ...(await readAdaptiveProfile(req.user.uid)).topicPerformance || {} };
    const review = questions.map((question, index) => {
      const isCorrect = answers[index] >= 0 && answers[index] === question.correctAnswer;
      if (isCorrect) correct++;
      const topic = question.topic;
      topicPerformance[topic] = topicPerformance[topic] || { attempts: 0, correct: 0 };
      topicPerformance[topic].attempts++;
      if (isCorrect) topicPerformance[topic].correct++;
      return {
        id: question.id, topic, question: question.question,
        options: question.options, selectedAnswer: answers[index],
        correctAnswer: question.correctAnswer, isCorrect,
        explanation: question.explanation, hint: question.hint
      };
    });

    const score = Math.round(correct / 8 * 100);
    const previous = await readAdaptiveProfile(req.user.uid);
    await Promise.all([
      saveAdaptiveProfile(req.user.uid, {
        topicPerformance,
        questionHistory: [...(previous.questionHistory || []), ...questions.map(q => q.question)].slice(-40),
        lastScore: score,
        totalAttempts: (Number(previous.totalAttempts) || 0) + 8
      }),
      sessionRef.update({ status: "submitted", submittedAt: admin.firestore.FieldValue.serverTimestamp() })
    ]);
    res.json({ success: true, correct, total: 8, score, review, topicPerformance });
  } catch (error) { next(error); }
});

router.get("/profile", async (req, res, next) => {
  try {
    const [progress, adaptive] = await Promise.all([
      readProgress(req.user.uid),
      readAdaptiveProfile(req.user.uid)
    ]);
    progress.topicPerformance = adaptive.topicPerformance || {};
    res.json({ success: true, course: analyzeProgress(progress), adaptive });
  } catch (error) { next(error); }
});

module.exports = router;
