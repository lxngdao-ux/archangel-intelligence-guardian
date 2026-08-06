import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

/**
 * The one interface every agent in the pipeline implements. This is the
 * seam described in docs/ARCHITECTURE.md §4 — the orchestrator only ever
 * talks to agents through this shape, so any agent can be replaced
 * (rule-based → ML-backed → LLM-backed) without touching the orchestrator
 * or its callers.
 */
export interface InvestigationAgent<TInput, TOutput> {
  readonly name: string;
  run(input: TInput, context: AgentContext): Promise<TOutput>;
}

export interface AgentContext {
  investigationId: string;
  db: PrismaClient;
  log: (message: string, data?: Record<string, unknown>) => void;
}

export function createAgentContext(investigationId: string): AgentContext {
  return {
    investigationId,
    db: prisma,
    log: (message, data) => {
      // Swap for a structured logger (pino/winston) before production —
      // kept as console output in v0.1 so the pipeline has zero infra deps.
      console.log(`[investigation:${investigationId}] ${message}`, data ?? "");
    },
  };
}

/** Records a provider call for audit/debugging — every agent should call this once per invocation. */
export async function recordAIAnalysis(
  context: AgentContext,
  params: { agentName: string; providerName: string; rawOutput: unknown; latencyMs: number },
) {
  await context.db.aIAnalysis.create({
    data: {
      investigationId: context.investigationId,
      agentName: params.agentName,
      providerName: params.providerName,
      rawOutput: params.rawOutput as object,
      latencyMs: params.latencyMs,
    },
  });
}
