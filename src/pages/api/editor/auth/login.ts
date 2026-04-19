import type { APIRoute } from "astro";
import { createEditorSession, getEditorStatus, verifyEditorPassword } from "@/lib/editor/auth";

export const prerender = false;

export const POST: APIRoute = async (context) => {
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

	let payload: { password?: string } = {};
	try {
		payload = (await context.request.json()) as { password?: string };
	} catch {
		return Response.json(
			{
				ok: false,
				message: "请求体必须是 JSON。",
			},
			{ status: 400 },
		);
	}

	const password = String(payload.password || "");
	if (!verifyEditorPassword(password)) {
		return Response.json(
			{
				ok: false,
				message: "密码错误。",
			},
			{ status: 401 },
		);
	}

	createEditorSession(context);
	return Response.json({
		ok: true,
		message: "登录成功。",
	});
};
