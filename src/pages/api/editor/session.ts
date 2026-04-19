import type { APIRoute } from "astro";
import { getEditorStatus } from "@/lib/editor/auth";
import { getPublishMissingEnv, isPublishConfigured } from "@/lib/editor/publish";

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const status = getEditorStatus(context);

	return Response.json({
		ok: true,
		authConfigured: status.configured,
		authenticated: status.authenticated,
		publishConfigured: isPublishConfigured(),
		missingPublishEnv: getPublishMissingEnv(),
	});
};
