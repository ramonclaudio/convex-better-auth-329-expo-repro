# convex-better-auth-329-repro

Hit a bug where Convex queries threw `Invalid session ID` every time a Better Auth session rotated (`changePassword({ revokeOtherSessions: true })`). The provider's `fetchAccessToken` was holding onto the JWT bound to the deleted session for ~500-1500 ms. Filed [`get-convex/better-auth#329`](https://github.com/get-convex/better-auth/pull/329) to fix it. This repo is the runnable repro: real Expo app, real Convex deployment, real Better Auth session. Swap one line in `package.json` to flip between vanilla `0.12.2` (broken) and the patched build (fixed).

Same app, same Convex deployment, same Better Auth session. Only the `@convex-dev/better-auth` version differs.

## Setup

You need an iOS simulator (or device), Node 22+, and your own Convex deployment.

```bash
npm install
echo 'EXPO_PUBLIC_CONVEX_URL=' > .env.local
echo 'EXPO_PUBLIC_CONVEX_SITE_URL=' >> .env.local
npx convex dev      # one terminal, creates a deployment, fills .env.local
```

On first `convex dev`, Convex will prompt you to log in and provision a deployment. After it finishes, set the Better Auth secret on the deployment env:

```bash
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
```

Then in another terminal:

```bash
npm run ios
```

## What the repro does

`src/app/index.tsx` mounts a single screen that:

1. Auto-signs-up `alice@test.com` on first launch, then signs in. Subsequent launches skip straight to sign-in.
2. Displays the current Better Auth `sessionId`, the `useConvexAuth().isAuthenticated` state, and the result of a Convex query (`api.functions.me`) that throws if the request lacks a valid session.
3. Has a big orange button: **Trigger session rotation**. Calls `authClient.changePassword({ revokeOtherSessions: true })`, which rotates the session id server-side.
4. Tails a log of state transitions so you can see the brief Convex query failure window.

With vanilla `0.12.2`: tap the button, the Convex query flickers to an error for ~500-1500 ms, then recovers when the provider eventually refreshes the token. The log shows the gap.

With the patched build: tap the button, the Convex query stays green. The provider drops the stale cached JWT inside the fetcher's synchronous prelude before the cache lookup, so the next `setAuth` reads a fresh token bound to the new session.

## Toggle the fix

The repo defaults to vanilla `0.12.2` (broken). To see the fix, swap one line in `package.json`:

```jsonc
// broken (vanilla npm)
"@convex-dev/better-auth": "0.12.2"

// fixed (patched build from PR #329)
"@convex-dev/better-auth": "file:./patches/convex-dev-better-auth-0.12.2.tgz"
```

Then force-install so npm actually swaps the package:

```bash
npm install --force
```

Restart `npm run ios` for the change to land in the running app.

## Why it happens

The bug is in `@convex-dev/better-auth/src/react/index.tsx`. The provider's `fetchAccessToken` is wrapped in `useCallback(..., [sessionId])` and captures `cachedToken` lexically. When the session id rotates A → B:

1. `useSession()` reports the new id.
2. `useCallback` rebuilds `fetchAccessToken` with `sessionId = B`. The new closure captures `cachedToken` as it is at this render, which is still the pre-rotation JWT because the state setter from a sibling `useEffect` hasn't flushed yet.
3. Convex's `ConvexAuthStateFirstEffect` (a CHILD component) fires its `useEffect([fetcher])` immediately. React fires child effects BEFORE parent effects, so the child reads the cache before any parent cleanup effect can clear it.
4. The fetcher returns the stale JWT. Convex submits it. The backend's session lookup for `sessionA` fails. Every in-flight query throws `Invalid session ID` until Convex eventually retries with `forceRefreshToken: true`.

The fix moves the rotation check into the fetcher's own synchronous prelude, before the cache lookup, and backs `cachedToken` with a ref so the fetcher reads the current value at call time. See [PR #329](https://github.com/get-convex/better-auth/pull/329) for the diff.

## License

MIT.
