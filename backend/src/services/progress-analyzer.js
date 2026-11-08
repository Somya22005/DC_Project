"use strict";

// IDs below match js/modules/registry.js and the existing route keys.
const TOPIC_MODULES = {
  Encoding: ["lab0", "framing"],
  Framing: ["framing"],
  Errors: ["errors"],
  ARQ: ["saw", "window"],
  Subnetting: ["subnets"],
  IP: ["ipheaders", "routing", "subnets"],
  Routing: ["routing"],
  TCP: ["tcpudp", "handshake", "congestion", "sockets"],
  DNS: ["dns"],
  HTTP: ["http"],
  TLS: ["http"],
  NAT: ["ipheaders", "firewall"],
  Sockets: ["sockets"]
};

const TUTORIAL_EVIDENCE = [
  { id: "t1", topics: ["Encoding", "Framing"], done: p => Boolean(p.flags?.typed && p.flags?.psMoved && p.flags?.transmitted && p.flags?.rebuilt) },
  { id: "t2", topics: ["ARQ", "IP"], done: p => Boolean((p.runs || []).some(r => r.loss >= 30) && p.flags?.retry && (p.runs || []).some(r => !r.ok) && p.flags?.viewedGap) },
  { id: "t3", topics: ["Errors"], done: p => Boolean(p.flags?.errflip && p.flags?.parityMiss && p.flags?.crcCatch && p.flags?.trials) },
  { id: "t4", topics: ["Subnetting"], done: p => Boolean(p.flags?.cidr20 && Number(p.stats?.subnetOk) >= 3) },
  { id: "t5", topics: ["ARQ", "TCP"], done: p => Boolean(p.flags?.saw && p.flags?.window && p.flags?.gbnBreak) },
  { id: "t6", topics: ["TCP", "TLS", "HTTP"], done: p => Boolean(p.flags?.handshake && p.flags?.filter && p.flags?.diagnosed && p.flags?.ecdh) }
];

function analyzeProgress(progress = {}) {
  const visited = progress.visited || {};
  const flags = progress.flags || {};
  const stats = progress.stats || {};
  const completedTutorialTopics = new Set();
  for (const tutorial of TUTORIAL_EVIDENCE) {
    if (tutorial.done(progress)) tutorial.topics.forEach(topic => completedTutorialTopics.add(topic));
  }

  const topics = Object.entries(TOPIC_MODULES).map(([topic, moduleIds]) => {
    const visitedCount = moduleIds.filter(id => Boolean(visited[id])).length;
    const activity = visitedCount / moduleIds.length;
    const tutorial = completedTutorialTopics.has(topic) ? 1 : 0;
    const quiz = progress.topicPerformance?.[topic] || {};
    const attempts = Number(quiz.attempts) || 0;
    const accuracy = attempts ? Math.max(0, Math.min(1, Number(quiz.correct) / attempts)) : null;
    const assessment = accuracy === null ? 0 : accuracy >= 0.7 ? 1 : accuracy;
    const completion = Math.round((activity * 0.35 + tutorial * 0.25 + assessment * 0.40) * 100);
    const eligible = activity > 0 || tutorial > 0 || attempts > 0;
    return { topic, completion, eligible, accuracy: accuracy === null ? null : Math.round(accuracy * 100), attempts };
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
  return profile.topics.filter(item => item.eligible).map(item => ({
    topic: item.topic,
    weight: item.accuracy === null ? 1 : Math.max(0.25, 1.15 - item.accuracy / 100),
    completion: item.completion,
    accuracy: item.accuracy
  })).sort((a, b) => b.weight - a.weight);
}

module.exports = { analyzeProgress, chooseTopicWeights };
