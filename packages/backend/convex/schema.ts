import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(),
    type: v.union(v.literal("client"), v.literal("professional")),
    role: v.union(v.literal("user"), v.literal("admin")),
  }).index("by_token", ["tokenIdentifier"]),

  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),

  occupations: defineTable({
    name: v.string(),
    description: v.string(),
    userId: v.id("users"),
  }),
});
