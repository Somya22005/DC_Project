"use strict";

require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { initializeFirebaseAdmin } = require("./src/firebase-admin");
const quizRoutes = require("./src/routes/quiz.routes");

const app = express();
const port = Number(process.env.PORT || 4320);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:8000")
  .split(",").map(value => value.trim()).filter(Boolean);

initializeFirebaseAdmin();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  }
  return res.status(403).json({ error: "Origin is not allowed." });
});
app.use("/api/quiz", rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.get("/health", (_req, res) => res.json({ success: true, service: "BitSecure Adaptive Quiz API" }));
app.use("/api/quiz", quizRoutes);
app.use((error, _req, res, _next) => {
  console.error("[BitSecure Quiz API]", error);
  res.status(error.status || 500).json({
    error: error.expose ? error.message : "The quiz service encountered an error."
  });
});
app.listen(port, "0.0.0.0", () => console.log(`BitSecure Adaptive Quiz API listening on :${port}`));
