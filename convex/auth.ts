import { expo } from "@better-auth/expo";
import { createClient } from "@convex-dev/better-auth";
import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";

import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
	authFunctions,
	triggers: {},
});

export const createAuth = (
	ctx: GenericCtx<DataModel>,
	{ optionsOnly } = { optionsOnly: false },
) =>
	betterAuth({
		baseURL: process.env.CONVEX_SITE_URL,
		database: authComponent.adapter(ctx),
		emailAndPassword: { enabled: true, autoSignIn: true },
		account: {
			accountLinking: { enabled: true },
		},
		// Expo dev sends Origin: exp://<host>:<port>. Trust it so /change-password
		// passes BA's origin check. Production apps would use the real scheme.
		trustedOrigins: ["exp://", "cba329repro://"],
		logger: { disabled: optionsOnly },
		plugins: [convex({ authConfig }), expo()],
	});

export const { onCreate, onDelete } = authComponent.triggersApi();
