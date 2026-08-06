import { prisma } from "@/server/db/prisma";
import { requireRole, toErrorResponse, ForbiddenError } from "@/server/auth/rbac";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("USER");

    const investigation = await prisma.investigation.findUnique({
      where: { id: params.id },
      include: {
        evidence: true,
        riskSignals: true,
        report: true,
        files: { select: { id: true, filename: true, mimeType: true, sizeBytes: true } },
      },
    });

    if (!investigation) {
      return Response.json(
        { error: { code: "INVESTIGATION_NOT_FOUND", message: "No investigation with that id." } },
        { status: 404 },
      );
    }

    const isOwner = investigation.userId === user.id;
    const isPrivileged = user.role === "ANALYST" || user.role === "ADMINISTRATOR";
    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError("You don't have access to this investigation.");
    }

    return Response.json(investigation);
  } catch (err) {
    return toErrorResponse(err);
  }
}
