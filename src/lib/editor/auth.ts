import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { APIContext } from "astro";

const COOKIE_NAME = import.meta.env.PROD
	? "__Host-firefly_editor_session"
	: "firefly_editor_session";
const DEFAULT_TTL = 60 * 60 * 24; // 24h
const MAX_PASSWORD_LENGTH = 1024;

type MinimalContext = Pick<APIContext, "cookies">;

function getEditorPassword() {
	return (import.meta.env.EDITOR_PASSWORD || "").trim();
}

function getEditorSecret() {
	const value =
		(import.meta.env.EDITOR_SESSION_SECRET || import.meta.env.EDITOR_PASSWORD || "").trim();
	return value;
}

function getTtlSeconds() {
	const raw = Number(import.meta.env.EDITOR_SESSION_TTL_SECONDS || DEFAULT_TTL);
	if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TTL;
	return Math.floor(raw);
}

function sign(payload: string, secret: string) {
	return createHmac("sha256", secret).update(payload).digest("base64url");
}

function digest(value: string) {
	return createHash("sha256").update(value, "utf8").digest();
}

function safeEqual(a: string, b: string) {
	const aBuf = digest(a);
	const bBuf = digest(b);
	return timingSafeEqual(aBuf, bBuf);
}

function buildToken(expiresAt: number, secret: string) {
	const payload = `v1:${expiresAt}`;
	const signature = sign(payload, secret);
	return `${expiresAt}.${signature}`;
}

function verifyToken(token: string, secret: string) {
	const [expiresAtRaw, signature] = token.split(".");
	if (!expiresAtRaw || !signature) return false;

	const expiresAt = Number(expiresAtRaw);
	if (!Number.isFinite(expiresAt)) return false;
	if (expiresAt <= Math.floor(Date.now() / 1000)) return false;

	const expected = sign(`v1:${expiresAt}`, secret);
	return safeEqual(signature, expected);
}

export function getEditorStatus(context: MinimalContext) {
	const password = getEditorPassword();
	const secret = getEditorSecret();
	const configured = Boolean(password && secret);

	if (!configured) {
		return {
			configured: false,
			authenticated: false,
		};
	}

	const token = context.cookies.get(COOKIE_NAME)?.value;
	const authenticated = Boolean(token && verifyToken(token, secret));
	return {
		configured: true,
		authenticated,
	};
}

export function verifyEditorPassword(password: string) {
	const expected = getEditorPassword();
	if (!expected || typeof password !== "string") return false;
	if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH) return false;
	return safeEqual(password, expected);
}

export function createEditorSession(context: MinimalContext) {
	const secret = getEditorSecret();
	const ttl = getTtlSeconds();
	const expiresAt = Math.floor(Date.now() / 1000) + ttl;
	const token = buildToken(expiresAt, secret);

	context.cookies.set(COOKIE_NAME, token, {
		path: "/",
		httpOnly: true,
		sameSite: "strict",
		secure: import.meta.env.PROD,
		maxAge: ttl,
	});
}

export function destroyEditorSession(context: MinimalContext) {
	context.cookies.delete(COOKIE_NAME, {
		path: "/",
		httpOnly: true,
		sameSite: "strict",
		secure: import.meta.env.PROD,
	});
}

export function ensureEditorAuth(context: MinimalContext) {
	const status = getEditorStatus(context);

	if (!status.configured) {
		return Response.json(
			{
				ok: false,
				message:
					"编辑器尚未配置，请设置 EDITOR_PASSWORD 与 EDITOR_SESSION_SECRET 环境变量。",
			},
			{ status: 503 },
		);
	}

	if (!status.authenticated) {
		return Response.json(
			{
				ok: false,
				message: "未登录或会话已过期，请重新登录。",
			},
			{ status: 401 },
		);
	}

	return null;
}
