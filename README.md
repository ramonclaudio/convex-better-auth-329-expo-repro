# convex-better-auth-329-expo-repro

Convex queries throw `Invalid session ID` whenever a Better Auth session rotates (`changePassword({ revokeOtherSessions: true })`, cross-domain handoff, custom plugin endpoints that call `setSessionCookie`). The provider's `fetchAccessToken` holds onto the JWT bound to the deleted session. Filed [`get-convex/better-auth#329`](https://github.com/get-convex/better-auth/pull/329) to fix the React-layer state machine.

This repo is the real-app reproduction: actual Expo app, actual Convex deployment, actual Better Auth session. Confirms the user-visible flicker exists, and shows the React-layer fix alone doesn't close it. The visible window is a Convex WebSocket race, same shape as [convex-js#82](https://github.com/get-convex/convex-js/issues/82).

## Run

You need an iOS simulator (or device), Node 22+, and a Convex account.

```bash
npm install
echo 'EXPO_PUBLIC_CONVEX_URL=' > .env.local
echo 'EXPO_PUBLIC_CONVEX_SITE_URL=' >> .env.local
npx convex dev    # one terminal, creates a deployment, fills .env.local
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
```

Then in another terminal:

```bash
npm run ios
```

## Toggle the fix

The repo defaults to vanilla `0.12.2` (broken). To swap to the patched build, edit `package.json`:

```jsonc
// broken (vanilla npm)
"@convex-dev/better-auth": "0.12.2"

// fixed (PR #329 build)
"@convex-dev/better-auth": "file:./patches/convex-dev-better-auth-0.12.2.tgz"
```

```bash
npm install --force
# restart npm run ios
```

## What you'll see

`src/app/index.tsx` mounts a single screen that auto-signs-up `alice+<timestamp>@test.com` and shows:

1. Current Better Auth `sessionId` and `useConvexAuth().isAuthenticated`.
2. A Convex query (`api.functions.me`) that throws on invalid session.
3. A "Trigger session rotation" button that calls `changePassword({ revokeOtherSessions: true })`.
4. An event log of state transitions.

In both vanilla and patched builds, tapping the button briefly flickers the Convex query to `UNAUTHED (stale JWT)` for ~500-1500 ms before recovery. The patched build runs the React-layer cache invalidation correctly (proven by the [unit-test repro](https://github.com/ramonclaudio/convex-better-auth-329-repro)), but the visible window persists because the Convex WebSocket race is independent of the React-layer cache. See [PR #329](https://github.com/get-convex/better-auth/pull/329) for the full investigation.

## Related

- [Unit tests](https://github.com/ramonclaudio/convex-better-auth-329-repro) (vitest + mocked React)
- [Expo](https://github.com/ramonclaudio/convex-better-auth-329-expo-repro) (this repo, real iOS + Convex + Better Auth)
- [TanStack](https://github.com/ramonclaudio/convex-better-auth-329-tanstack-repro) (real browser + Convex + Better Auth)

Upstream PRs and issues:
- [get-convex/better-auth#329](https://github.com/get-convex/better-auth/pull/329): this PR (React-layer cache fix)
- [convex-js#82](https://github.com/get-convex/convex-js/issues/82): upstream Convex issue (setAuth behavior)
- [better-auth/better-auth#9345](https://github.com/better-auth/better-auth/pull/9345): upstream Better Auth complement (preserve caller's session on change-password)

## License

MIT.
