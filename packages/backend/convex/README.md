# Welcome to your Convex functions directory

Write your Convex functions here.
See <https://docs.convex.dev/functions> for more.

A query function that takes two arguments looks like:

```ts
// functions.js
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQueryFunction = query({
  // Validators for arguments.
  args: {
    first: v.number(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Read the database as many times as you need here.
    // See https://docs.convex.dev/database/reading-data.
    const documents = await ctx.db.query("tablename").collect();

    // Arguments passed from the client are properties of the args object.
    console.log(args.first, args.second);

    // Write arbitrary JavaScript here: filter, aggregate, build derived data,
    // remove non-public properties, or create new objects.
    return documents;
  },
});
```

Using this query function in a React component looks like:

```ts
const data = useQuery(api.functions.myQueryFunction, {
  first: 10,
  second: "hello",
});
```

A mutation function looks like:

```ts
// functions.js
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const myMutationFunction = mutation({
  // Validators for arguments.
  args: {
    first: v.string(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Insert or modify documents in the database here.
    // Mutations can also read from the database like queries.
    // See https://docs.convex.dev/database/writing-data.
    const message = { body: args.first, author: args.second };
    const id = await ctx.db.insert("messages", message);

    // Optionally, return a value from your mutation.
    return await ctx.db.get(id);
  },
});
```

Using this mutation function in a React component looks like:

```ts
const mutation = useMutation(api.functions.myMutationFunction);
function handleButtonPress() {
  // fire and forget, the most common way to use mutations
  mutation({ first: "Hello!", second: "me" });
  // OR
  // use the result once the mutation has completed
  mutation({ first: "Hello!", second: "me" }).then((result) =>
    console.log(result),
  );
}
```

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.

# Authenticated Query and Mutation Wrappers

This package provides custom authenticated query and mutation wrappers using `convex-helpers` that automatically validate user authentication and provide the authenticated user in the context.

## Features

- **Automatic Authentication**: Validates that the user is authenticated before executing the function
- **User Context**: Automatically provides the authenticated user in `ctx.user`
- **Type Safety**: Full TypeScript support with typed context
- **Error Handling**: Throws descriptive errors for unauthenticated or missing users

## Installation

The required dependencies are already installed:

- `convex-helpers` - Provides the custom function utilities
- `@convex-dev/auth` - Handles authentication

## Usage

### Basic Usage

Import the authenticated wrappers instead of the standard `query` and `mutation`:

```typescript
import { authenticatedQuery, authenticatedMutation } from "./helpers";
import { v } from "convex/values";

// Authenticated query example
export const getCurrentUser = authenticatedQuery({
  args: {},
  returns: v.object({
    _id: v.id("users"),
    name: v.string(),
    email: v.string(),
    // ... other user fields
  }),
  handler: async (ctx, args) => {
    // ctx.user is automatically available and type-safe!
    return ctx.user;
  },
});

// Authenticated mutation example
export const updateProfile = authenticatedMutation({
  args: {
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // ctx.user is automatically available
    await ctx.db.patch(ctx.user._id, { name: args.name });
    return null;
  },
});
```

### Role-Based Access Control

You can easily implement role-based access control:

```typescript
export const adminOnlyFunction = authenticatedQuery({
  args: {},
  returns: v.object({
    stats: v.any(),
  }),
  handler: async (ctx, args) => {
    // Check user role
    if (ctx.user.role !== "admin") {
      throw new Error("Access denied: Admin role required");
    }
    
    // Admin-only logic here
    return { stats: "admin data" };
  },
});
```

### User-Specific Data

Access user-specific data easily:

```typescript
export const getUserOccupations = authenticatedQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("occupations"),
    name: v.string(),
    description: v.string(),
  })),
  handler: async (ctx, args) => {
    // Filter data by the authenticated user
    return await ctx.db
      .query("occupations")
      .filter((q) => q.eq(q.field("userId"), ctx.user._id))
      .collect();
  },
});
```

## Context Types

The wrappers provide enhanced context types:

- `AuthenticatedQueryCtx`: Standard query context + `user: Doc<"users">`
- `AuthenticatedMutationCtx`: Standard mutation context + `user: Doc<"users">`

## Error Handling

The wrappers automatically handle authentication errors:

- **"Not authenticated"**: Thrown when no user identity is found
- **"User not found"**: Thrown when the user exists in auth but not in the users table

## Implementation Details

### Authentication Flow

1. Extracts user identity from `ctx.auth.getUserIdentity()`
2. Looks up the user in the `users` table using the `by_token` index
3. Validates both identity and user record exist
4. Provides the user object in the enhanced context

### Schema Requirements

The implementation requires:

- A `users` table with a `tokenIdentifier` field
- An index `by_token` on `["tokenIdentifier"]`

This matches the existing schema in `schema.ts`.

## Examples

The implementation provides a clean, simple API for authenticated functions.

## Migration from Standard Functions

To migrate existing functions:

1. Replace `query` with `authenticatedQuery`
2. Replace `mutation` with `authenticatedMutation`
3. Remove manual authentication calls (e.g., `requireAuth(ctx)`)
4. Use `ctx.user` directly instead of the returned user object

### Before

```typescript
import { query } from "./_generated/server";
import { requireAuth } from "./auth";

export const getProfile = query({
  args: {},
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    return user;
  },
});
```

### After

```typescript
import { authenticatedQuery } from "./helpers";

export const getProfile = authenticatedQuery({
  args: {},
  handler: async (ctx, args) => {
    return ctx.user;
  },
});
```

## Best Practices

1. **Use for all user-specific operations**: Any function that needs to know the current user
2. **Implement role checks**: Add role validation within handlers when needed
3. **Handle errors gracefully**: The wrappers throw errors for unauthenticated access
4. **Type safety**: Leverage the typed context for better development experience
