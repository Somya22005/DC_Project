"use strict";

const Groq = require("groq-sdk");
const { chooseTopicWeights } = require("./progress-analyzer");
const { validateBatch } = require("./question-validator");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateQuestionBatch(profile, previousQuestions = []) {
  if (!process.env.GROQ_API_KEY) throw new Error("Groq is not configured.");
  const topicWeights = chooseTopicWeights(profile);
  if (!topicWeights.length) {
    const error = new Error("Complete or attempt a course module before starting an adaptive quiz.");
    error.status = 422;
    error.expose = true;
    throw error;
  }
  const allowedTopics = new Set(topicWeights.map(item => item.topic));
  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    temperature: 0.75,
    max_tokens: 4500,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are BitSecure, an expert Data Communications and Computer Networks instructor. Return only valid JSON with a questions array. Each question must have topic, question, options (exactly four strings), correctAnswer (zero-based integer), explanation, hint, difficulty (beginner/intermediate/advanced/expert), and type. Write accurate, unambiguous, self-contained questions. Never invent syllabus completion. Avoid repeated concepts and the supplied previous question texts. Do not include markdown."
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Generate exactly 8 multiple-choice questions for this learner.",
          course: "Data Communications and Computer Networks",
          overallCompletion: profile.overallCompletion,
          eligibleTopicWeights: topicWeights,
          distribution: "Prioritize weak eligible topics, include questions from other eligible topics, and vary difficulty according to completion and accuracy. Do not test topics the learner has not started.",
          previousQuestions: previousQuestions.slice(-40),
          outputShape: { questions: [{ topic: "TCP", question: "Question text", options: ["A", "B", "C", "D"], correctAnswer: 0, explanation: "Explanation", hint: "Hint", difficulty: "intermediate", type: "concept" }] }
        })
      }
    ]
  });
  const content = response.choices?.[0]?.message?.content || "{}";
  let parsed;
  try { parsed = JSON.parse(content); }
  catch (_error) { throw new Error("Groq returned invalid JSON."); }
  return validateBatch(parsed.questions, allowedTopics, 8);
}

module.exports = { generateQuestionBatch };
