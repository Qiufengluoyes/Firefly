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

	const posts = await getCollection("posts");
	const sorted = posts.sort((a, b) => {
		if (a.data.pinned && !b.data.pinned) return -1;
		if (!a.data.pinned && b.data.pinned) return 1;
		return new Date(b.data.published).getTime() - new Date(a.data.published).getTime();
	});

	return Response.json({
		ok: true,
		posts: sorted.map((entry) => ({
			id: entry.id,
			slug: removeFileExtension(entry.id),
			format: detectEditorPostFormat(entry.id),
			title: entry.data.title,
			published: formatDateToYYYYMMDD(new Date(entry.data.published)),
			updated: entry.data.updated
				? formatDateToYYYYMMDD(new Date(entry.data.updated))
				: "",
			draft: Boolean(entry.data.draft),
			pinned: Boolean(entry.data.pinned),
		})),
	});
};
