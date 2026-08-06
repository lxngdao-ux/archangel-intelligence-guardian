import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireRole, toErrorResponse } from "@/server/auth/rbac";

const investigationTypeEnum = z.enum(["URL", "SCREENSHOT", "PDF", "IMAGE", "TEXT", "WHATSAPP"]);
const investigationStatusEnum = z.enum([
  "PENDING",
  "COLLECTING_EVIDENCE",
  "ANALYZING",
  "COMPLETED",
  "FAILED",
]);

const createInvestigationSchema = z.object({
  type: investigationTypeEnum,
  inputText: z.string().min(1).optional(),
  fileIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireRole("USER");
    const { searchParams } = new URL(request.url);
    const statusParsed = investigationStatusEnum.safeParse(searchParams.get("status"));
    const typeParsed = investigationTypeEnum.safeParse(searchParams.get("type"));
    const limit = Math.min(Number(searchParams.get("limit") ?? 20) || 20, 50);
    const cursor = searchParams.get("cursor") ?? undefined;

    const investigations = await prisma.investigation.findMany({
      where: {
        userId: user.id,
        ...(statusParsed.success ? { status: statusParsed.data } : {}),
        ...(typeParsed.success ? { type: typeParsed.data } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { report: { select: { trustScore: true, riskLevel: true } } },
    });

    return Response.json({
      investigations,
      nextCursor: investigations.length === limit ? investigations[investigations.length - 1]?.id : null,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("USER");
    const body = await request.json().catch(() => null);
    const parsed = createInvestigationSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } },
        { status: 400 },
      );
    }

    const { type, inputText, fileIds } = parsed.data;

    const needsText = type === "URL" || type === "TEXT" || type === "WHATSAPP";
    const needsFiles = type === "SCREENSHOT" || type === "PDF" || type === "IMAGE";

    if (needsText && !inputText) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: `inputText is required for type "${type}".` } },
        { status: 400 },
      );
    }
    if (needsFiles && (!fileIds || fileIds.length === 0)) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: `At least one fileId is required for type "${type}".` } },
        { status: 400 },
      );
    }

    const investigation = await prisma.investigation.create({
      data: {
        userId: user.id,
        type,
        inputText,
        ...(fileIds && fileIds.length > 0
          ? { files: { connect: fileIds.map((id) => ({ id })) } }
          : {}),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "investigation.created",
        entityType: "Investigation",
        entityId: investigation.id,
      },
    });

    return Response.json(investigation, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
