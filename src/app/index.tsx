import { useConvexAuth, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authClient } from "../../lib/auth-client";
import { api } from "../../convex/_generated/api";

type LogLine = { t: number; kind: "info" | "ok" | "err"; text: string };

// Fresh user every boot so accumulated DB state doesn't poison repeated runs.
const TEST_EMAIL = `alice+${Date.now()}@test.com`;
const PASSWORD_A = "passwordOriginalA1";
const PASSWORD_B = "passwordRotatedB2";

export default function Repro() {
	const { isLoading, isAuthenticated } = useConvexAuth();
	const session = authClient.useSession();
	const me = useQuery(api.functions.me, isAuthenticated ? {} : "skip");

	const [log, setLog] = useState<LogLine[]>([]);
	const [password, setPassword] = useState(PASSWORD_A);
	const [rotating, setRotating] = useState(false);
	const bootstrapped = useRef(false);

	const append = useCallback((kind: LogLine["kind"], text: string) => {
		setLog((prev) =>
			[{ t: Date.now(), kind, text }, ...prev].slice(0, 50),
		);
	}, []);

	useEffect(() => {
		if (bootstrapped.current) return;
		bootstrapped.current = true;
		(async () => {
			append("info", `signing up ${TEST_EMAIL}…`);
			const su = await authClient.signUp.email({
				email: TEST_EMAIL,
				password: PASSWORD_A,
				name: "Alice",
			});
			if (su.error) {
				append("err", `sign-up failed: ${su.error.message}`);
				return;
			}
			append("ok", "signed up + auto-signed-in");
			setPassword(PASSWORD_A);
		})();
	}, [append]);

	const rotate = useCallback(async () => {
		setRotating(true);
		const from = password;
		const to = from === PASSWORD_A ? PASSWORD_B : PASSWORD_A;
		append("info", "change-password (revokeOtherSessions: true)…");
		const r = await authClient.changePassword({
			currentPassword: from,
			newPassword: to,
			revokeOtherSessions: true,
		});
		if (r.error) {
			append("err", `change-password failed: ${r.error.message}`);
		} else {
			append("ok", "change-password ok, session rotated server-side");
			setPassword(to);
		}
		setRotating(false);
	}, [password, append]);

	const lastMeRef = useRef<string>("");
	useEffect(() => {
		const snapshot =
			me === undefined
				? "loading"
				: me === null
					? "null"
					: me.authed
						? `authed:${me.email}`
						: "unauthed";
		if (snapshot !== lastMeRef.current) {
			lastMeRef.current = snapshot;
			if (me === undefined) {
				append("info", "Convex query: loading");
			} else if (me?.authed) {
				append("ok", `Convex query: authed as ${me.email}`);
			} else if (me && !me.authed) {
				append("err", "Convex query: UNAUTHED (stale JWT)");
			}
		}
	}, [me, append]);

	const sessionId = session.data?.session.id ?? null;

	return (
		<SafeAreaView style={styles.root} edges={["top", "bottom"]}>
			<ScrollView contentContainerStyle={styles.scroll}>
				<Text style={styles.title}>convex-better-auth #329 repro</Text>
				<Text style={styles.subtitle}>
					change-password rotates the BA session id; the Convex provider's
					cached JWT stays bound to the deleted session for ~500-1500 ms
				</Text>

				<View style={styles.card}>
					<Row
						label="useConvexAuth.isAuthenticated"
						value={String(isAuthenticated)}
					/>
					<Row label="useConvexAuth.isLoading" value={String(isLoading)} />
					<Row label="useSession sessionId" value={sessionId ?? "—"} />
					<Row
						label="Convex query: api.functions.me"
						value={
							me === undefined
								? "loading…"
								: me === null
									? "null"
									: me.authed
										? `✓ authed as ${me.email}`
										: "✗ UNAUTHED (stale JWT)"
						}
					/>
				</View>

				<Pressable
					onPress={rotate}
					disabled={!isAuthenticated || rotating}
					style={({ pressed }) => [
						styles.button,
						(!isAuthenticated || rotating) && styles.buttonDisabled,
						pressed && styles.buttonPressed,
					]}
				>
					<Text style={styles.buttonText}>
						{rotating ? "rotating…" : "Trigger session rotation"}
					</Text>
				</Pressable>

				<View style={styles.logBox}>
					{log.map((line) => (
						<Text
							key={`${line.t}-${line.text}`}
							style={[
								styles.logLine,
								line.kind === "ok" && styles.logOk,
								line.kind === "err" && styles.logErr,
							]}
						>
							{new Date(line.t).toLocaleTimeString()} · {line.text}
						</Text>
					))}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.row}>
			<Text style={styles.rowLabel}>{label}</Text>
			<Text style={styles.rowValue}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: "#0b0b10" },
	scroll: { padding: 16, gap: 12 },
	title: { color: "#fafafa", fontSize: 20, fontWeight: "600" },
	subtitle: { color: "#a1a1aa", fontSize: 13, lineHeight: 18 },
	card: { backgroundColor: "#18181b", borderRadius: 12, padding: 12, gap: 6 },
	row: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
	rowLabel: { color: "#a1a1aa", fontSize: 12, flex: 1.1 },
	rowValue: { color: "#fafafa", fontSize: 12, flex: 1.4, fontFamily: "Menlo" },
	button: {
		backgroundColor: "#f97316",
		borderRadius: 10,
		paddingVertical: 14,
		alignItems: "center",
	},
	buttonDisabled: { backgroundColor: "#3f3f46" },
	buttonPressed: { opacity: 0.75 },
	buttonText: { color: "#0b0b10", fontWeight: "600" },
	logBox: { backgroundColor: "#18181b", borderRadius: 12, padding: 12, gap: 4 },
	logLine: { color: "#a1a1aa", fontSize: 11, fontFamily: "Menlo" },
	logOk: { color: "#86efac" },
	logErr: { color: "#fca5a5" },
});
