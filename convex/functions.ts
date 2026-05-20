import { query } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * Returns the authenticated user's session-bound identity. This is the query
 * that flashes "Not authenticated" / `Invalid session ID` after a session
 * rotation when the React provider holds onto the stale cached JWT.
 */
export const me = query({
	args: {},
	handler: async (ctx) => {
		// Don't throw on unauth; return a sentinel so useQuery doesn't crash the
		// component during the brief window when the cached JWT is stale.
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return { email: null, id: null, now: Date.now(), authed: false };
		}
		try {
			const user = await authComponent.getAuthUser(ctx);
			return {
				email: user?.email ?? identity.email ?? null,
				id: identity.subject,
				now: Date.now(),
				authed: true,
			};
		} catch {
			// authComponent.getAuthUser throws when the session referenced by the
			// JWT no longer exists. This is exactly the bug — a stale JWT whose
			// signature validates but whose session was deleted by the rotation.
			return { email: null, id: null, now: Date.now(), authed: false };
		}
	},
});
