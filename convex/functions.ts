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
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			throw new Error("Not authenticated");
		}
		return {
			email: user.email,
			id: user._id,
			now: Date.now(),
		};
	},
});
