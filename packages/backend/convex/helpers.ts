import {
  customQuery,
  customMutation,
  customCtx,
} from "convex-helpers/server/customFunctions";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/**
 * Reusable function to get the authenticated user from the database
 */
async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Reusable function to validate admin access
 */
function validateAdminAccess(user: Doc<"users">): void {
  if (user.role !== "admin") {
    throw new Error("Access denied: Admin role required");
  }
}

/**
 * Custom authenticated query that automatically validates authentication
 * and provides the authenticated user in context.
 */
export const authenticatedQuery = customQuery(
  query,
  customCtx(async (ctx: QueryCtx) => {
    const user = await getAuthenticatedUser(ctx);
    return { user };
  })
);

/**
 * Custom authenticated mutation that automatically validates authentication
 * and provides the authenticated user in context.
 */
export const authenticatedMutation = customMutation(
  mutation,
  customCtx(async (ctx: MutationCtx) => {
    const user = await getAuthenticatedUser(ctx);
    return { user };
  })
);

/**
 * Custom authenticated query that automatically validates authentication and admin access
 * and provides the authenticated user in context.
 */
export const adminOnlyQuery = customQuery(
  query,
  customCtx(async (ctx: QueryCtx) => {
    const user = await getAuthenticatedUser(ctx);
    validateAdminAccess(user);
    return { user };
  })
);

/**
 * Custom authenticated mutation that automatically validates authentication and admin access
 * and provides the authenticated user in context.
 */
export const adminOnlyMutation = customMutation(
  mutation,
  customCtx(async (ctx: MutationCtx) => {
    const user = await getAuthenticatedUser(ctx);
    validateAdminAccess(user);
    return { user };
  })
);

// Type helpers for the authenticated context
export type AuthenticatedQueryCtx = QueryCtx & {
  user: Doc<"users">;
};

export type AuthenticatedMutationCtx = MutationCtx & {
  user: Doc<"users">;
};

export type AdminOnlyQueryCtx = QueryCtx & {
  user: Doc<"users">;
};

export type AdminOnlyMutationCtx = MutationCtx & {
  user: Doc<"users">;
};
