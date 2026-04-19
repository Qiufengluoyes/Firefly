import fs from "node:fs";
import path from "node:path";
import { removeFileExtension } from "@/utils/url-utils";

const POSTS_DIR = path.resolve(process.cwd(), "src/content/posts");

function normalizeEntryId(entryId: string): string {
	return String(entryId || "").trim().replace(/\\/g, "/");
}

function uniquePaths(items: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const item of items) {
		const normalized = item.replace(/\\/g, "/");
		if (!normalized || seen.has(normalized)) continue;
		seen.add(normalized);
		result.push(normalized);
	}
	return result;
}

export function detectEditorPostFormat(entryId: string): "md" | "mdx" {
	const normalizedId = normalizeEntryId(entryId);
	if (!normalizedId) return "md";

	const lower = normalizedId.toLowerCase();
	if (lower.endsWith(".mdx")) return "mdx";
	if (lower.endsWith(".md")) return "md";

	const slug = removeFileExtension(normalizedId).replace(/^\/+|\/+$/g, "");
	const slashIndexSlug = slug.endsWith("/index") ? slug.slice(0, -"/index".length) : slug;
	const candidates = uniquePaths([
		slug,
		slashIndexSlug,
		slug ? `${slug}/index` : "",
		slashIndexSlug ? `${slashIndexSlug}/index` : "",
	]).filter(Boolean);

	for (const candidate of candidates) {
		const mdxPath = path.join(POSTS_DIR, `${candidate}.mdx`);
		if (fs.existsSync(mdxPath)) return "mdx";
	}

	for (const candidate of candidates) {
		const mdPath = path.join(POSTS_DIR, `${candidate}.md`);
		if (fs.existsSync(mdPath)) return "md";
	}

	return "md";
}
