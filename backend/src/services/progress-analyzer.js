"use strict";

// These route IDs correspond to BitSecure's existing module registry.
const TOPIC_MODULES = {
  Encoding: ["framing"],
  Framing: ["framing"],
  Errors: ["errors"],
  ARQ: ["saw", "window"],
  Subnetting: ["subnets"],
  IP: ["ip", "routing", "subnets"],
  Routing: ["routing", "topology"],
  TCP: ["tcp", "handshake", "congestion", "sockets"],
  DNS: ["dns"],
  HTTP: ["http"],
  TLS: ["http", "encryption"],
  NAT: ["ip", "firewall"],
  Sockets: ["sockets"]
};

const TUTORIALS = {
  t1: ["Encoding", "Framing"],
  t2: ["ARQ", "IP"],
  t3: ["Errors"],
  t4: ["Subnetting"],
  t5: ["ARQ", "TCP"],
  t6: ["TCP", "TLS", "HTTP"]
};

function tutorialCompletion(progress, topic) {
  const completed = new Set();
  for (const [id, topics] of Object.entries(TUTORIALS)) {
    const tutorial = progress?.tut?.[id];
    if (tutorial === true || tutorial?.completed === true || tutorial?.done === true) {
      topics.forEach(item => completed.add(item));
    }
  }
  return completed.has(topic) ? 1 : 0;
}

function analyzeProgress(progress = {}) {
  const visited = progress.visited || {};
  const flags = progress.flags || {};
  const stats = progress.stats || {};
  const topics = Object.keys(TOPIC_MODULES).map(topic => {
    const moduleIds = TOPIC_MODULES[topic];
    const visitedCount = moduleIds.filter(id => Boolean(visited[id] || visited[`m:${id}`])).length;
    const activity = moduleIds.length ? visitedCount / moduleIds.length : 0;
    const tutorial = tutorialCompletion(progress, topic);
    const quiz = progress.topicPerformance?.[topic] || {};
    const attempts = Number(quiz.attempts) || 0;
    const accuracy = attempts ? Math.max(0, Math.min(1, Number(quiz.correct) / attempts)) : null;
    const assessment = accuracy === null ? 0 : accuracy >= 0.7 ? 1 : accuracy;
    // Hybrid score: meaningful activity and tutorial completion, then assessment evidence.
    const completion = Math.round((activity * 0.35 + tutorial * 0.25 + assessment * 0.40) * 100);
    const eligible = activity > 0 || tutorial > 0 || attempts > 0;
    return {
      topic, completion, eligible,
      accuracy: accuracy === null ? null : Math.round(accuracy * 100),
      attempts
    };
  });
  const eligible = topics.filter(item => item.eligible);
  const overall = eligible.length
    ? Math.round(eligible.reduce((sum, item) => sum + item.completion, 0) / topics.length)
    : 0;
  return {
    overallCompletion: overall,
    topics,
    activitySignals: Object.keys(flags).length,
    quizLevel: Math.max(1, Math.min(5, Number(stats.quizLevel) || 1))
  };
}

function chooseTopicWeights(profile) {
  const eligible = profile.topics.filter(item => item.eligible);
  if (!eligible.length) return [];
  return eligible.map(item => ({
    topic: item.topic,
    weight: item.accuracy === null ? 1 : Math.max(0.25, 1.15 - item.accuracy / 100),
    completion: item.completion,
    accuracy: item.accuracy
  })).sort((a, b) => b.weight - a.weight);
}

module.exports = { analyzeProgress, chooseTopicWeights };
