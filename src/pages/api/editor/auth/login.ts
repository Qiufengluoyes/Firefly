import type { APIContext, APIRoute } from "astro";
import { createEditorSession, getEditorStatus, verifyEditorPassword } from "@/lib/editor/auth";

export const prerender = false;

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;

type LoginRateState = {
	count: number;
	windowStart: number;
	blockedUntil: number;
};

const loginRateMap = new Map<string, LoginRateState>();

function jsonNoStore(payload: Record<string, unknown>, status: number) {
	return Response.json(payload, {
		status,
		headers: {
			"Cache-Control": "no-store",
		},
	});
}

function getRateKey(context: Pick<APIContext, "request">) {
	const xff = context.request.headers.get("x-forwarded-for") || "";
	const realIp = context.request.headers.get("x-real-ip") || "";
	const clientIp = xff.split(",")[0]?.trim() || realIp.trim() || "unknown";
	const ua = (context.request.headers.get("user-agent") || "").slice(0, 120);
	return `${clientIp}|${ua}`;
}

function getRateState(key: string, now: number): LoginRateState {
	const current = loginRateMap.get(key);
	if (!current) {
		const next = { count: 0, windowStart: now, blockedUntil: 0 };
		loginRateMap.set(key, next);
		return next;
	}

	if (current.windowStart + LOGIN_WINDOW_MS < now) {
		current.count = 0;
		current.windowStart = now;
		current.blockedUntil = 0;
	}
	return current;
}

function isBlocked(state: LoginRateState, now: number) {
	return state.blockedUntil > now;
}

function recordFailure(state: LoginRateState, now: number) {
	state.count += 1;
	if (state.count >= LOGIN_MAX_ATTEMPTS) {
		state.blockedUntil = now + LOGIN_BLOCK_MS;
	}
}

function clearRateState(key: string) {
	loginRateMap.delete(key);
}

export const POST: APIRoute = async (context) => {
	const status = getEditorStatus(context);
	if (!status.configured) {
		return jsonNoStore(
			{
				ok: false,
				message:
					"编辑器尚未配置，请设置 EDITOR_PASSWORD 与 EDITOR_SESSION_SECRET 环境变量。",
			},
			503,
		);
	}

	const now = Date.now();
	const rateKey = getRateKey(context);
	const rateState = getRateState(rateKey, now);
	if (isBlocked(rateState, now)) {
		return jsonNoStore(
			{
				ok: false,
				message: "登录尝试过于频繁，请稍后再试。",
			},
			429,
		);
	}

	let payload: { password?: string } = {};
	try {
		payload = (await context.request.json()) as { password?: string };
	} catch {
		return jsonNoStore(
			{
				ok: false,
				message: "请求体必须是 JSON。",
			},
			400,
		);
	}

	const password = String(payload.password || "");
	if (!verifyEditorPassword(password)) {
		recordFailure(rateState, now);
		return jsonNoStore(
			{
				ok: false,
				message: "登录失败，请检查凭据。",
			},
			401,
		);
	}

	clearRateState(rateKey);
	createEditorSession(context);
	return jsonNoStore(
		{
			ok: true,
			message: "登录成功。",
		},
		200,
	);
};
