import { expoClient } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { env } from "./env";

export const authClient = createAuthClient({
	baseURL: env.convexSiteUrl,
	plugins: [
		convexClient(),
		expoClient({
			scheme: "cba329repro",
			storagePrefix: "cba329repro",
			storage: SecureStore,
		}),
	],
});
