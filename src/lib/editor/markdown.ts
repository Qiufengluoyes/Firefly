import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import * as astroJsxRuntime from "astro/jsx-runtime";
import mdxServerRenderer from "@astrojs/mdx/server.js";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeCallouts from "rehype-callouts";
import rehypeComponents from "rehype-components";
import rehypeExpressiveCode from "rehype-expressive-code";
import rehypeKatex from "rehype-katex";
import katex from "katex";
import "katex/dist/contrib/mhchem.mjs";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import { expressiveCodeConfig, siteConfig } from "@/config";
import { pluginCustomCopyButton } from "@/plugins/expressive-code/custom-copy-button";
import { LinkCardComponent } from "@/plugins/rehype-component-link-card.mjs";
import { rehypeMermaid } from "@/plugins/rehype-mermaid.mjs";
import rehypeEmailProtection from "@/plugins/rehype-email-protection.mjs";
import { parseDirectiveNode } from "@/plugins/remark-directive-rehype";
import { remarkExcerpt } from "@/plugins/remark-excerpt";
import remarkImageCaption from "@/plugins/remark-image-caption";
import remarkImageWidth from "@/plugins/remark-image-width";
import { remarkMermaid } from "@/plugins/remark-mermaid";
import { remarkReadingTime } from "@/plugins/remark-reading-time.mjs";
import { GithubCardComponent } from "@/plugins/rehype-component-github-card.mjs";
import { buildFrontmatterData } from "./post";
import type { NormalizedEditorPost, RenderedEditorPreview } from "./types";

const require = createRequire(import.meta.url);

type EvaluateFunction = (
	source: unknown,
	options: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
type AstroContainerInstance = Awaited<ReturnType<typeof AstroContainer.create>>;

const MDX_IMPORT_LINE_RE = /^\s*import\s+.+$/gmu;
const MDX_REEXPORT_LINE_RE =
	/^\s*export\s+(?:\*|\{[^}]+\})\s+from\s+["'][^"']+["'];?\s*$/gmu;

let markdownProcessorPromise: ReturnType<typeof createMarkdownProcessor> | null = null;
let mdxEvaluatePromise: Promise<EvaluateFunction> | null = null;
let mdxContainerPromise: Promise<AstroContainerInstance> | null = null;

function createRemarkPlugins() {
	return [
		remarkMath,
		remarkReadingTime,
		remarkExcerpt,
		[remarkImageCaption, { className: "image-caption" }],
		remarkImageWidth,
		remarkDirective,
		remarkSectionize,
		parseDirectiveNode,
		remarkMermaid,
	];
}

function createRehypePlugins() {
	return [
		[
			rehypeExpressiveCode,
			{
				themes: [expressiveCodeConfig.darkTheme, expressiveCodeConfig.lightTheme],
				useDarkModeMediaQuery: false,
				themeCssSelector: (theme: { name: string }) => `[data-theme='${theme.name}']`,
				plugins: [
					pluginCollapsibleSections(),
					pluginLineNumbers(),
					pluginCustomCopyButton(),
				],
				defaultProps: {
					wrap: false,
					overridesByLang: {
						shellsession: {
							showLineNumbers: false,
						},
					},
				},
				styleOverrides: {
					borderRadius: "0.75rem",
					codeFontSize: "0.875rem",
					codeFontFamily:
						"'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
					codeLineHeight: "1.5rem",
					frames: {},
					textMarkers: {
						delHue: 0,
						insHue: 180,
						markHue: 250,
					},
				},
				frames: {
					showCopyToClipboardButton: false,
				},
			},
		],
		[rehypeKatex, { katex }],
		[rehypeCallouts, { theme: siteConfig.rehypeCallouts.theme }],
		rehypeSlug,
		rehypeMermaid,
		[rehypeEmailProtection, { method: "base64" }],
		[
			rehypeComponents,
			{
				components: {
					github: GithubCardComponent,
					"link-card": LinkCardComponent,
				},
			},
		],
		[
			rehypeAutolinkHeadings,
			{
				behavior: "append",
				properties: {
					className: ["anchor"],
				},
				content: {
					type: "element",
					tagName: "span",
					properties: {
						className: ["anchor-icon"],
						"data-pagefind-ignore": true,
					},
					children: [{ type: "text", value: "" }],
				},
			},
		],
	];
}

async function getMarkdownProcessor() {
	if (!markdownProcessorPromise) {
		markdownProcessorPromise = createMarkdownProcessor({
			syntaxHighlight: false,
			remarkPlugins: createRemarkPlugins(),
			rehypePlugins: createRehypePlugins(),
		});
	}
	return markdownProcessorPromise;
}

async function getMdxEvaluate() {
	if (!mdxEvaluatePromise) {
		mdxEvaluatePromise = (async () => {
			const astroMdxPackagePath = require.resolve("@astrojs/mdx/package.json");
			const mdxEntrypoint = require.resolve("@mdx-js/mdx", {
				paths: [path.dirname(astroMdxPackagePath)],
			});
			const mdxModule = (await import(pathToFileURL(mdxEntrypoint).href)) as {
				evaluate?: EvaluateFunction;
			};
			if (typeof mdxModule.evaluate !== "function") {
				throw new Error("MDX evaluator not available");
			}
			return mdxModule.evaluate;
		})();
	}

	try {
		return await mdxEvaluatePromise;
	} catch (error) {
		mdxEvaluatePromise = null;
		throw error;
	}
}

async function getMdxContainer() {
	if (!mdxContainerPromise) {
		mdxContainerPromise = AstroContainer.create().then((container) => {
			container.addServerRenderer({ renderer: mdxServerRenderer });
			return container;
		});
	}

	try {
		return await mdxContainerPromise;
	} catch (error) {
		mdxContainerPromise = null;
		throw error;
	}
}

function sanitizeMdxSource(source: string) {
	return source
		.replace(MDX_IMPORT_LINE_RE, "")
		.replace(MDX_REEXPORT_LINE_RE, "")
		.trimEnd();
}

function createMdxComponents() {
	const fallbackComponent = (props: Record<string, unknown> = {}) =>
		astroJsxRuntime.jsx(astroJsxRuntime.Fragment, { children: props.children ?? null });

	const known: Record<string, (props?: Record<string, unknown>) => unknown> = {
		Icon: fallbackComponent,
	};

	return new Proxy(known, {
		get(target, key) {
			if (typeof key !== "string") return undefined;
			return key in target ? target[key] : fallbackComponent;
		},
	});
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function toSafeHeadings(headings: unknown): RenderedEditorPreview["headings"] {
	if (!Array.isArray(headings)) return [];
	return headings
		.map((heading) => {
			if (!heading || typeof heading !== "object") return null;
			const data = heading as Record<string, unknown>;
			return {
				depth: Number(data.depth || 0),
				slug: String(data.slug || ""),
				text: String(data.text || ""),
			};
		})
		.filter((heading): heading is RenderedEditorPreview["headings"][number] => Boolean(heading));
}

async function renderMarkdownPreview(
	post: NormalizedEditorPost,
	virtualFilePath: string,
): Promise<RenderedEditorPreview> {
	const processor = await getMarkdownProcessor();

	const result = await processor.render(post.body, {
		frontmatter: buildFrontmatterData(post),
		// `fileURL` is accepted at runtime by Astro's markdown processor,
		// but its current type definition does not expose this field.
		fileURL: pathToFileURL(virtualFilePath),
	} as never);

	const metadata = result.metadata.frontmatter as Record<string, unknown>;

	return {
		html: result.code,
		headings: toSafeHeadings(result.metadata.headings),
		words: Number(metadata.words || 0),
		minutes: Number(metadata.minutes || 0),
		excerpt: String(metadata.excerpt || ""),
	};
}

async function renderMdxPreview(
	post: NormalizedEditorPost,
	virtualFilePath: string,
): Promise<RenderedEditorPreview> {
	const evaluate = await getMdxEvaluate();
	const container = await getMdxContainer();

	const frontmatter = buildFrontmatterData(post) as unknown as Record<string, unknown>;
	const sourceFile = {
		value: sanitizeMdxSource(post.body),
		path: virtualFilePath,
		data: {
			astro: {
				frontmatter,
			},
		},
	};

	const mdxModule = await evaluate(sourceFile, {
		...astroJsxRuntime,
		jsxImportSource: "astro",
		format: "mdx",
		baseUrl: pathToFileURL(virtualFilePath),
		remarkPlugins: createRemarkPlugins(),
		rehypePlugins: createRehypePlugins(),
	});

	const content = mdxModule.default;
	if (typeof content !== "function") {
		throw new Error("MDX preview failed: missing default component");
	}

	const html = await container.renderToString(content as never, {
		props: {
			components: createMdxComponents(),
		},
	});

	const metadata = sourceFile.data.astro.frontmatter as Record<string, unknown>;
	const exportedHeadings =
		typeof mdxModule.getHeadings === "function" ? mdxModule.getHeadings() : [];

	return {
		html,
		headings: toSafeHeadings(exportedHeadings),
		words: Number(metadata.words || 0),
		minutes: Number(metadata.minutes || 0),
		excerpt: String(metadata.excerpt || ""),
	};
}

export async function renderEditorPreview(
	post: NormalizedEditorPost,
): Promise<RenderedEditorPreview> {
	const extension = post.format === "mdx" ? "mdx" : "md";
	const virtualFilePath = path.resolve(process.cwd(), "src/content/posts", `${post.slug}.${extension}`);

	if (post.format !== "mdx") {
		return renderMarkdownPreview(post, virtualFilePath);
	}

	try {
		return await renderMdxPreview(post, virtualFilePath);
	} catch (error) {
		const fallback = await renderMarkdownPreview(post, virtualFilePath);
		const message = error instanceof Error ? error.message : "MDX preview failed";
		return {
			...fallback,
			html: `<p class="text-sm text-amber-600 dark:text-amber-400">${escapeHtml(message)}</p>${fallback.html}`,
		};
	}
}
