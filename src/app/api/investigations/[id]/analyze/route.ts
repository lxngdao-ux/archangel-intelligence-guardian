import { prisma } from "@/server/db/prisma";
import { requireRole, toErrorResponse, ForbiddenError } from "@/server/auth/rbac";
import { investigationOrchestrator } from "@/server/agents/orchestrator";

/**
 * Synchronous in v0.1 — the request stays open for the pipeline's duration.
 * See docs/API_DESIGN.md and docs/ROADMAP.md "Scaling notes": this handler
 * is intentionally thin so swapping to `queue.enqueue(id)` instead of
 * `await investigationOrchestrator.run(id)` is the only change needed later.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("USER");

    const investigation = await prisma.investigation.findUnique({ where: { id: params.id } });
    if (!investigation) {
      return Response.json(
        { error: { code: "INVESTIGATION_NOT_FOUND", message: "No investigation with that id." } },
        { status: 404 },
      );
    }
    if (investigation.userId !== user.id && user.role === "USER") {
      throw new ForbiddenError("You don't have access to this investigation.");
    }
    if (investigation.status !== "PENDING") {
      return Response.json(
        {
          error: {
            code: "INVALID_STATE",
            message: `Investigation is already "${investigation.status}" — it can only be analyzed once from PENDING.`,
          },
        },
        { status: 409 },
      );
    }

    const report = await investigationOrchestrator.run(params.id);
    const updated = await prisma.investigation.findUnique({
      where: { id: params.id },
      include: { report: true, riskSignals: true, evidence: true },
    });

    return Response.json({ investigation: updated, report });
  } catch (err) {
    return toErrorResponse(err);
  }
}
