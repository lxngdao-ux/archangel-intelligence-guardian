import type { DefaultSession } from "next-auth";

// Module augmentation so `session.user.id` / `session.user.role` type-check
// everywhere without casting. Kept next to auth.config.ts conceptually, but
// .d.ts files must live where the TS project picks them up automatically.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
