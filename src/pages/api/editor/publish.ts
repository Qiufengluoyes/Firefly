import type { APIRoute } from "astro";
import { ensureEditorAuth } from "@/lib/editor/auth";
import { normalizeEditorPostInput } from "@/lib/editor/post";
import { publishPostToGitHub } from "@/lib/editor/publish";

export const prerender = false;

export const POST: APIRoute = async (context) => {
	const authError = ensureEditorAuth(context);
	if (authError) return authError;

	let rawPayload: unknown;
	try {
		rawPayload = await context.request.json();
	} catch {
		return Response.json(
			{
				ok: false,
				message: "请求体必须是 JSON。",
			},
			{ status: 400 },
		);
	}

	try {
		const post = normalizeEditorPostInput(rawPayload);
		const publishResult = await publishPostToGitHub(post);

		return Response.json({
			ok: true,
			message: "发布成功。",
			result: publishResult,
		});
	} catch (error) {
		return Response.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "发布失败。",
			},
			{ status: 400 },
		);
	}
};
