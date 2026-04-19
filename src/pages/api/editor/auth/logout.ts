import type { APIRoute } from "astro";
import { destroyEditorSession } from "@/lib/editor/auth";

export const prerender = false;

export const POST: APIRoute = async (context) => {
	destroyEditorSession(context);
	return Response.json({
		ok: true,
		message: "已退出登录。",
	});
};
