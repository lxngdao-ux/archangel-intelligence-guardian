import { prisma } from "@/server/db/prisma";
import { requireRole, toErrorResponse } from "@/server/auth/rbac";

export async function GET() {
  try {
    const user = await requireRole("USER");
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return Response.json({ notifications });
  } catch (err) {
    return toErrorResponse(err);
  }
}
