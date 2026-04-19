import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { ensureEditorAuth } from "@/lib/editor/auth";
import { detectEditorPostFormat } from "@/lib/editor/format";
import { formatDateToYYYYMMDD } from "@/utils/date-utils";
import { removeFileExtension } from "@/utils/url-utils";

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const authError = ensureEditorAuth(context);
	if (authError) return authError;

	const slugParam = decodeURIComponent(context.params.slug || "").trim();
	if (!slugParam) {
		return Response.json(
			{
				ok: false,
				message: "缺少 slug 参数。",
			},
			{ status: 400 },
		);
	}

	const posts = await getCollection("posts");
	const entry = posts.find((post) => removeFileExtension(post.id) === slugParam);

	if (!entry) {
		return Response.json(
			{
				ok: false,
				message: `未找到文章：${slugParam}`,
			},
			{ status: 404 },
		);
	}

	return Response.json({
		ok: true,
		post: {
			title: entry.data.title,
			slug: removeFileExtension(entry.id),
			format: detectEditorPostFormat(entry.id),
			description: entry.data.description || "",
			published: formatDateToYYYYMMDD(new Date(entry.data.published)),
			updated: entry.data.updated
				? formatDateToYYYYMMDD(new Date(entry.data.updated))
				: "",
			tags: Array.isArray(entry.data.tags) ? entry.data.tags.join(", ") : "",
			category: entry.data.category || "",
			image: entry.data.image || "",
			lang: entry.data.lang || "",
			draft: Boolean(entry.data.draft),
			pinned: Boolean(entry.data.pinned),
			comment: entry.data.comment !== false,
			body: entry.body || "",
		},
	});
};
