import { prisma } from "@/server/db/prisma";
import { requireRole, toErrorResponse, ForbiddenError } from "@/server/auth/rbac";

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("USER");
    const notification = await prisma.notification.findUnique({ where: { id: params.id } });
    if (!notification) {
      return Response.json(
        { error: { code: "NOTIFICATION_NOT_FOUND", message: "No notification with that id." } },
        { status: 404 },
      );
    }
    if (notification.userId !== user.id) {
      throw new ForbiddenError("You don't have access to this notification.");
    }
    const updated = await prisma.notification.update({
      where: { id: params.id },
      data: { read: true },
    });
    return Response.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}
