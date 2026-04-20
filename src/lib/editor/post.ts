import matter from "gray-matter";
import type { EditorPostInput, NormalizedEditorPost } from "./types";

const SLUG_UNSAFE_RE = /[^\p{Letter}\p{Number}\-_./]+/gu;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toYamlSingleQuoted(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

function unquoteYamlScalar(raw: string): string {
	const value = raw.trim();
	if (value.length < 2) return value;
	const first = value[0];
	const last = value[value.length - 1];
	if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
		return value.slice(1, -1);
	}
	return value;
}

function ensureObject(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("请求体必须是对象。");
	}
	return value as Record<string, unknown>;
}

function normalizeDate(date: unknown, fallback: string): string {
	if (typeof date !== "string") return fallback;
	const value = date.trim();
	if (!value) return fallback;
	if (!DATE_RE.test(value)) {
		throw new Error(`日期格式错误：${value}，应为 YYYY-MM-DD。`);
	}
	return value;
}

function normalizeTags(tags: unknown): string[] {
	if (!tags) return [];
	if (Array.isArray(tags)) {
		return tags
			.map((tag) => String(tag).trim())
			.filter((tag) => tag.length > 0);
	}
	if (typeof tags === "string") {
		return tags
			.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0);
	}
	return [];
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
	if (typeof value === "boolean") return value;
	return fallback;
}

function normalizeFormat(value: unknown): "md" | "mdx" {
	if (typeof value !== "string") return "md";
	const normalized = value.trim().toLowerCase();
	return normalized === "mdx" ? "mdx" : "md";
}

export function slugifyTitle(title: string): string {
	return title
		.trim()
		.toLowerCase()
		.replace(SLUG_UNSAFE_RE, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80);
}

function normalizeSlug(input: unknown, title: string, published: string): string {
	const source =
		typeof input === "string" && input.trim().length > 0
			? input.trim()
			: slugifyTitle(title);

	const cleaned = source
		.replace(SLUG_UNSAFE_RE, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");

	const fallback = `${published}-${Math.floor(Date.now() / 1000)}`;
	const finalSlug = cleaned || fallback;

	if (finalSlug.includes("..") || finalSlug.startsWith("/")) {
		throw new Error("Slug 非法，请勿包含路径跳转字符。");
	}
	return finalSlug;
}

export function normalizeEditorPostInput(input: unknown): NormalizedEditorPost {
	const data = ensureObject(input);
	const title = String(data.title ?? "").trim();
	const body = String(data.body ?? "").replace(/\r\n/g, "\n");

	if (!title) throw new Error("标题不能为空。");
	if (!body.trim()) throw new Error("正文不能为空。");

	const today = new Date().toISOString().slice(0, 10);
	const published = normalizeDate(data.published, today);
	const slug = normalizeSlug(data.slug, title, published);
	const updatedRaw = normalizeDate(data.updated, "");
	const updated = updatedRaw || undefined;
	const format = normalizeFormat(data.format);

	return {
		title,
		slug,
		format,
		description: String(data.description ?? "").trim(),
		body: body.trimEnd(),
		published,
		updated,
		tags: normalizeTags(data.tags),
		category: String(data.category ?? "").trim(),
		lang: String(data.lang ?? "").trim(),
		image: String(data.image ?? "").trim(),
		draft: normalizeBoolean(data.draft, false),
		pinned: normalizeBoolean(data.pinned, false),
		comment: normalizeBoolean(data.comment, true),
	};
}

export function buildFrontmatterData(post: NormalizedEditorPost): EditorPostInput {
	const frontmatter: EditorPostInput = {
		title: post.title,
		published: post.published,
	};

	if (post.updated) {
		frontmatter.updated = post.updated;
	}
	if (post.description) {
		frontmatter.description = post.description;
	}
	if (post.image) {
		frontmatter.image = post.image;
	}
	if (post.tags.length > 0) {
		frontmatter.tags = post.tags;
	}
	if (post.category) {
		frontmatter.category = post.category;
	}
	frontmatter.draft = post.draft;
	if (post.pinned) {
		frontmatter.pinned = true;
	}
	if (post.lang) {
		frontmatter.lang = post.lang;
	}
	if (post.comment === false) {
		frontmatter.comment = false;
	}

	return frontmatter;
}

export function buildMarkdownDocument(post: NormalizedEditorPost): string {
	const file = matter.stringify(`${post.body}\n`, buildFrontmatterData(post), {
		flowLevel: 1,
		lineWidth: -1,
		sortKeys: false,
	});
	const normalized = file
		.replace(/\r\n/g, "\n")
		.replace(/^(published|updated):\s'(\d{4}-\d{2}-\d{2})'$/gm, "$1: $2");
	return normalized.replace(/^category:\s*(.+)$/gm, (_match, rawValue: string) => {
		const category = unquoteYamlScalar(rawValue);
		return `category: ${toYamlSingleQuoted(category)}`;
	});
}
