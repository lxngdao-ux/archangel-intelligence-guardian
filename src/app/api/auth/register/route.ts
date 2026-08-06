import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } },
      { status: 400 },
    );
  }

  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return Response.json(
      { error: { code: "EMAIL_TAKEN", message: "An account with this email already exists." } },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash, name },
  });

  return Response.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
}
