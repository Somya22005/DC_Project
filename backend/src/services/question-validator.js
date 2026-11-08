"use strict";

const ALLOWED_DIFFICULTIES = new Set(["beginner", "intermediate", "advanced", "expert"]);

function validateBatch(input, allowedTopics, count = 8) {
  if (!Array.isArray(input) || input.length !== count) {
    throw new Error(`The model must return exactly ${count} questions.`);
  }
  const seen = new Set();
  return input.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error("Malformed question.");
    const topic = String(item.topic || "").trim();
    const question = String(item.question || "").trim();
    const options = Array.isArray(item.options) ? item.options.map(x => String(x).trim()) : [];
    const correctAnswer = Number(item.correctAnswer);
    const explanation = String(item.explanation || "").trim();
    const difficulty = String(item.difficulty || "intermediate").toLowerCase();
    if (!allowedTopics.has(topic)) throw new Error("Question topic is not eligible for this learner.");
    if (question.length < 12 || question.length > 700 || options.length !== 4 ||
        options.some(x => !x || x.length > 240) || new Set(options).size !== 4 ||
        !Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3 ||
        explanation.length < 12 || explanation.length > 900 ||
        !ALLOWED_DIFFICULTIES.has(difficulty)) {
      throw new Error("A generated question did not pass validation.");
    }
    const fingerprint = question.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(fingerprint)) throw new Error("The model generated a duplicate question.");
    seen.add(fingerprint);
    return {
      id: `ai-${index + 1}`, topic, question, options, correctAnswer,
      explanation, hint: String(item.hint || "Identify the relevant networking principle before comparing the choices."),
      difficulty, type: String(item.type || "concept")
    };
  });
}

module.exports = { validateBatch };
