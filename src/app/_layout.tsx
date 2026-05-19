import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { useMemo } from "react";

import { authClient } from "../../lib/auth-client";
import { env } from "../../lib/env";

export default function RootLayout() {
	const client = useMemo(
		() =>
			new ConvexReactClient(env.convexUrl, {
				unsavedChangesWarning: false,
			}),
		[],
	);

	return (
		<ConvexBetterAuthProvider client={client} authClient={authClient}>
			<Stack screenOptions={{ headerShown: false }} />
		</ConvexBetterAuthProvider>
	);
}
