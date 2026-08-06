import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireRole, toErrorResponse } from "@/server/auth/rbac";

const updateSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireRole("USER");
    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
    });

    return Response.json({ id: updated.id, name: updated.name });
  } catch (err) {
    return toErrorResponse(err);
  }
}
