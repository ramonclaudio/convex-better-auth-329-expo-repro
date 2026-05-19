import { defineSchema } from "convex/server";

// Better Auth manages its own tables via the component. This repro doesn't
// need any app-specific tables.
export default defineSchema({});
