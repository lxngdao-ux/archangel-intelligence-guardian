import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth.config";

export type AppRole = "USER" | "ANALYST" | "ADMINISTRATOR";

const ROLE_RANK: Record<AppRole, number> = {
  USER: 0,
  ANALYST: 1,
  ADMINISTRATOR: 2,
};

export class UnauthorizedError extends Error {
  status = 401;
  code = "UNAUTHORIZED";
}

export class ForbiddenError extends Error {
  status = 403;
  code = "FORBIDDEN";
}

/**
 * Central RBAC gate. Route handlers call this instead of re-implementing
 * role checks — see docs/API_DESIGN.md "RBAC summary" for the role matrix.
 *
 * @param minimumRole the least-privileged role allowed to proceed
 */
export async function requireRole(minimumRole: AppRole = "USER") {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new UnauthorizedError("Sign in required.");

  const userRole = (session.user.role as AppRole) ?? "USER";
  if (ROLE_RANK[userRole] < ROLE_RANK[minimumRole]) {
    throw new ForbiddenError(`Requires ${minimumRole} role or higher.`);
  }

  return session.user;
}

/** Convenience wrapper for route handlers to map thrown auth errors to responses. */
export function toErrorResponse(err: unknown) {
  if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
    return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  console.error(err);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
    { status: 500 },
  );
}
