import { SIGNATURES, UNKNOWN_SIGNATURE } from './knowledgeBase.js';

const round = (n) => Math.round(n * 100) / 100;

/**
 * Built-in reasoning engine (AI-based analysis, Step 4) — works fully offline.
 * Scores every known failure signature against the collected evidence,
 * picks the most likely root cause and explains its reasoning.
 */
export function analyzeLocally(ctx) {
  const ranked = SIGNATURES.map((sig) => {
    const { score, evidence } = sig.score(ctx);
    return { sig, score: Math.min(score, 0.98), evidence };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 0.3) {
    return {
      engine: 'local',
      signatureId: UNKNOWN_SIGNATURE.id,
      signatureName: UNKNOWN_SIGNATURE.name,
      category: UNKNOWN_SIGNATURE.category,
      rootCause: UNKNOWN_SIGNATURE.rootCause,
      confidence: 0.3,
      evidence: ctx.anomalies.flatMap((a) => a.evidence).slice(0, 5),
      recommendedActions: [...UNKNOWN_SIGNATURE.playbook],
      alternatives: [],
      summary: `Unclassified failure on ${ctx.service.name}; falling back to a safe restart.`,
    };
  }

  // Confidence is reduced when a runner-up hypothesis is almost as likely.
  const runnerUp = ranked[1]?.score || 0;
  const margin = best.score - runnerUp;
  const confidence = round(Math.max(0.35, Math.min(0.97, best.score - (margin < 0.15 ? 0.1 : 0))));

  return {
    engine: 'local',
    signatureId: best.sig.id,
    signatureName: best.sig.name,
    category: best.sig.category,
    rootCause: best.sig.rootCause,
    confidence,
    evidence: best.evidence,
    recommendedActions: [...best.sig.playbook],
    alternatives: ranked.slice(1, 3).map((r) => ({ signatureId: r.sig.id, name: r.sig.name, confidence: round(r.score) })),
    summary: `${best.sig.name} on ${ctx.service.name}: ${best.sig.rootCause}`,
  };
}
