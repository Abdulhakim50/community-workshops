import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import * as authSchema from "../db/auth-schema";
import { organizers } from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const existing = await db
            .select({ id: organizers.id })
            .from(organizers)
            .where(eq(organizers.contactEmail, user.email))
            .limit(1);

          if (existing.length > 0) {
            throw new APIError("BAD_REQUEST", {
              message: "An organizer profile already uses this email.",
            });
          }

          return { data: user };
        },
        after: async (user) => {
          await db.insert(organizers).values({
            authUserId: user.id,
            name: user.name,
            contactEmail: user.email,
          });
        },
      },
    },
  },
});
