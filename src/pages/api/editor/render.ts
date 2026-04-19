import type { APIRoute } from "astro";
import { ensureEditorAuth } from "@/lib/editor/auth";
import { renderEditorPreview } from "@/lib/editor/markdown";
import { normalizeEditorPostInput } from "@/lib/editor/post";

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
		const preview = await renderEditorPreview(post);

		return Response.json({
			ok: true,
			preview,
			post: {
				slug: post.slug,
				format: post.format,
				title: post.title,
				published: post.published,
				tags: post.tags,
			},
		});
	} catch (error) {
		return Response.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "渲染失败。",
			},
			{ status: 400 },
		);
	}
};
