import { buildMarkdownDocument } from "./post";
import type { NormalizedEditorPost } from "./types";

const GITHUB_API_BASE = "https://api.github.com";

type PublishConfig = {
	token: string;
	owner: string;
	repo: string;
	branch: string;
	postsDir: string;
	committerName?: string;
	committerEmail?: string;
};

function buildConfig(): PublishConfig | null {
	const token = (import.meta.env.EDITOR_GITHUB_TOKEN || "").trim();
	const owner = (import.meta.env.EDITOR_GITHUB_OWNER || "").trim();
	const repo = (import.meta.env.EDITOR_GITHUB_REPO || "").trim();
	const branch = (import.meta.env.EDITOR_GITHUB_BRANCH || "master").trim();
	const postsDir = (import.meta.env.EDITOR_POSTS_DIR || "src/content/posts")
		.trim()
		.replace(/^\/+/, "")
		.replace(/\/+$/, "");

	if (!token || !owner || !repo || !postsDir) {
		return null;
	}

	return {
		token,
		owner,
		repo,
		branch,
		postsDir,
		committerName: (import.meta.env.EDITOR_GITHUB_COMMITTER_NAME || "").trim() || undefined,
		committerEmail:
			(import.meta.env.EDITOR_GITHUB_COMMITTER_EMAIL || "").trim() || undefined,
	};
}

export function getPublishMissingEnv() {
	const missing: string[] = [];
	if (!(import.meta.env.EDITOR_GITHUB_TOKEN || "").trim()) {
		missing.push("EDITOR_GITHUB_TOKEN");
	}
	if (!(import.meta.env.EDITOR_GITHUB_OWNER || "").trim()) {
		missing.push("EDITOR_GITHUB_OWNER");
	}
	if (!(import.meta.env.EDITOR_GITHUB_REPO || "").trim()) {
		missing.push("EDITOR_GITHUB_REPO");
	}
	return missing;
}

export function isPublishConfigured() {
	return getPublishMissingEnv().length === 0;
}

function githubHeaders(token: string) {
	return {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		"Content-Type": "application/json",
		"User-Agent": "firefly-editor",
	};
}

function encodeContentPath(path: string) {
	return path
		.split("/")
		.filter(Boolean)
		.map((segment) => encodeURIComponent(segment))
		.join("/");
}

async function readGitHubError(response: Response) {
	const text = await response.text();
	try {
		const data = JSON.parse(text) as { message?: string };
		return data.message || text || `HTTP ${response.status}`;
	} catch {
		return text || `HTTP ${response.status}`;
	}
}

export async function publishPostToGitHub(post: NormalizedEditorPost) {
	const config = buildConfig();
	if (!config) {
		throw new Error(
			"发布配置缺失，请设置 EDITOR_GITHUB_TOKEN / EDITOR_GITHUB_OWNER / EDITOR_GITHUB_REPO。",
		);
	}

	const extension = post.format === "mdx" ? "mdx" : "md";
	const filePath = `${config.postsDir}/${post.slug}.${extension}`;
	if (filePath.includes("..")) {
		throw new Error("目标路径非法，请检查 slug。");
	}

	const encodedPath = encodeContentPath(filePath);
	const endpoint = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/contents/${encodedPath}`;
	let sha: string | undefined;

	const checkResponse = await fetch(
		`${endpoint}?ref=${encodeURIComponent(config.branch)}`,
		{
			headers: githubHeaders(config.token),
		},
	);

	if (checkResponse.ok) {
		const current = (await checkResponse.json()) as { sha?: string };
		sha = current.sha;
	} else if (checkResponse.status !== 404) {
		throw new Error(`查询目标文件失败：${await readGitHubError(checkResponse)}`);
	}

	const content = Buffer.from(buildMarkdownDocument(post), "utf8").toString("base64");
	const payload: Record<string, unknown> = {
		message: `publish: ${post.title}`,
		content,
		branch: config.branch,
		sha,
	};

	if (config.committerName && config.committerEmail) {
		payload.committer = {
			name: config.committerName,
			email: config.committerEmail,
		};
	}

	const publishResponse = await fetch(endpoint, {
		method: "PUT",
		headers: githubHeaders(config.token),
		body: JSON.stringify(payload),
	});

	if (!publishResponse.ok) {
		throw new Error(`发布失败：${await readGitHubError(publishResponse)}`);
	}

	const result = (await publishResponse.json()) as {
		content?: { path?: string; html_url?: string };
		commit?: { sha?: string; html_url?: string };
	};

	return {
		path: result.content?.path || filePath,
		fileUrl: result.content?.html_url || "",
		commitSha: result.commit?.sha || "",
		commitUrl: result.commit?.html_url || "",
		postUrl: `/posts/${post.slug}/`,
	};
}
