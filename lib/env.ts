const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexSiteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

if (!convexUrl) {
	throw new Error(
		"Missing EXPO_PUBLIC_CONVEX_URL. Copy .env.example to .env.local and fill it in.",
	);
}
if (!convexSiteUrl) {
	throw new Error(
		"Missing EXPO_PUBLIC_CONVEX_SITE_URL. Copy .env.example to .env.local and fill it in.",
	);
}

export const env = { convexUrl, convexSiteUrl } as const;
