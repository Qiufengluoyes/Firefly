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
	const sourcePath = resolveEditorPostSourcePath(entryId);
	return sourcePath.toLowerCase().endsWith(".mdx") ? "mdx" : "md";
}

export function resolveEditorPostSourcePath(entryId: string): string {
	const normalizedId = normalizeEntryId(entryId).replace(/^\/+|\/+$/g, "");
	if (!normalizedId) return "";

	const slugFromId = removeFileExtension(normalizedId).replace(/^\/+|\/+$/g, "");
	const lowerId = normalizedId.toLowerCase();
	if (
		slugFromId &&
		!slugFromId.includes("/") &&
		(lowerId.endsWith(".md") || lowerId.endsWith(".mdx"))
	) {
		const preferFolderIndex = uniquePaths([
			`${slugFromId}/index.mdx`,
			`${slugFromId}/index.md`,
		]);
		for (const candidate of preferFolderIndex) {
			if (fs.existsSync(path.join(POSTS_DIR, candidate))) {
				return candidate;
			}
		}
	}

	if ((lowerId.endsWith(".md") || lowerId.endsWith(".mdx")) && fs.existsSync(path.join(POSTS_DIR, normalizedId))) {
		return normalizedId;
	}

	const slug = removeFileExtension(normalizedId).replace(/^\/+|\/+$/g, "");
	if (!slug) return "";

	const withoutIndex = slug.endsWith("/index") ? slug.slice(0, -"/index".length) : slug;
	const candidates = uniquePaths([
		`${slug}.mdx`,
		`${slug}.md`,
		withoutIndex ? `${withoutIndex}/index.mdx` : "",
		withoutIndex ? `${withoutIndex}/index.md` : "",
		withoutIndex ? `${withoutIndex}.mdx` : "",
		withoutIndex ? `${withoutIndex}.md` : "",
	]).filter(Boolean);

	for (const candidate of candidates) {
		if (fs.existsSync(path.join(POSTS_DIR, candidate))) {
			return candidate;
		}
	}

	if (slug.endsWith("/index")) {
		return `${slug}.md`;
	}
	return `${slug}.md`;
}
