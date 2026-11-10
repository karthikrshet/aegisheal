import { analyzeLocally } from './localAnalyzer.js';
import { analyzeWithClaude } from './llmAnalyzer.js';

/**
 * AI analysis entry point. Always computes the local analysis (fast, offline,
 * deterministic). When the Claude provider is enabled and responds with a valid
 * answer, its conclusion is used and the local result is kept as a second opinion.
 */
export async function analyzeIncident(ctx, { provider, apiKey, model }) {
  const local = analyzeLocally(ctx);
  if (provider !== 'claude') return local;

  const llm = await analyzeWithClaude(ctx, { apiKey, model });
  if (!llm) return { ...local, engine: 'local (Claude unavailable)' };

  const agrees = llm.signatureId === local.signatureId;
  return {
    ...llm,
    // Agreement between two independent engines increases confidence.
    confidence: Math.min(0.99, agrees ? Math.max(llm.confidence, local.confidence) + 0.05 : llm.confidence),
    secondOpinion: { engine: 'local', signatureId: local.signatureId, confidence: local.confidence, agrees },
  };
}
