import { fileURLToPath } from "node:url";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components"; /* Render the custom directive content */
import rehypeKatex from "rehype-katex";
import katex from "katex";
import "katex/dist/contrib/mhchem.mjs"; // 加载 mhchem 扩展
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive"; /* Handle directives */
import remarkMath from "remark-math";
import rehypeCallouts from "rehype-callouts";
import remarkSectionize from "remark-sectionize";
import { expressiveCodeConfig, siteConfig } from "./src/config";
import { pluginCustomCopyButton } from "./src/plugins/expressive-code/custom-copy-button.js";
// import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge.ts";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { rehypeMermaid } from "./src/plugins/rehype-mermaid.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkMermaid } from "./src/plugins/remark-mermaid.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";
import mdx from "@astrojs/mdx";
import { LinkCardComponent } from "./src/plugins/rehype-component-link-card.mjs";
import remarkImageCaption from "./src/plugins/remark-image-caption.ts";
import remarkImageWidth from './src/plugins/remark-image-width.js';
import rehypeEmailProtection from "./src/plugins/rehype-email-protection.mjs";
import { rehypeResponsiveImages } from "./src/plugins/rehype-responsive-images.mjs";

const rehypeCalloutsTheme =
	siteConfig.rehypeCallouts.theme === "vitepress"
		? fileURLToPath(new URL("./src/styles/rehype-callouts-vitepress.css", import.meta.url))
		: `rehype-callouts/theme/${siteConfig.rehypeCallouts.theme}`;

const astroIconInclude = {
	"fa6-brands": ["creative-commons"],
	"fa6-regular": ["address-card"],
	"fa6-solid": [
		"arrow-right",
		"arrow-rotate-left",
		"arrow-up-right-from-square",
		"chevron-left",
		"chevron-right",
		"rocket",
		"xmark",
	],
	ic: ["round-mail-outline"],
	majesticons: ["status-online"],
	"material-symbols": [
		"archive",
		"arrow-outward-rounded",
		"article",
		"article-outline",
		"article-outline-rounded",
		"book-2-outline-rounded",
		"brightness-auto-outline-rounded",
		"calendar-clock-outline",
		"calendar-today-outline-rounded",
		"chat",
		"check",
		"chevron-left-rounded",
		"chevron-right-rounded",
		"close",
		"copyright-outline-rounded",
		"dark-mode-outline-rounded",
		"download",
		"ecg-heart-outline",
		"edit-calendar-outline-rounded",
		"emoji-people-rounded",
		"error-outline",
		"favorite",
		"folder-outline",
		"format-list-bulleted",
		"group",
		"help-outline",
		"hide-image-outline",
		"history-rounded",
		"home",
		"home-outline-rounded",
		"home-pin-outline",
		"image-outline",
		"info",
		"info-outline",
		"keyboard-arrow-down-rounded",
		"keyboard-arrow-up-rounded",
		"label-outline",
		"link",
		"menu-rounded",
		"more-horiz",
		"movie",
		"notes-rounded",
		"palette-outline",
		"person",
		"pinboard",
		"rss-feed",
		"schedule-outline-rounded",
		"search",
		"search-off",
		"sentiment-sad",
		"settings",
		"share",
		"tag-rounded",
		"text-ad-outline-rounded",
		"visibility-outline-rounded",
		"wallpaper",
		"wb-sunny-outline-rounded",
	],
	mdi: [
		"calendar-month-outline",
		"clock-time-eight-outline",
		"file-document-outline",
		"pin",
		"steam",
		"train",
	],
	mingcute: ["bilibili-line"],
	tabler: ["brand-github"],
};

// https://astro.build/config
export default defineConfig({
	site: siteConfig.site_url,
	adapter: vercel(),
	image: {
		responsiveStyles: true,
		layout: "constrained",
	},

	base: "/",
	trailingSlash: "always",
	integrations: [
		tailwind({
			nesting: true,
		}),
		swup({
			theme: false,
			animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
			// the default value `transition-` cause transition delay
			// when the Tailwind class `transition-all` is used
			containers: ["#swup-container", "#right-sidebar-dynamic", "#floating-toc-wrapper"],
			smoothScrolling: false,
			cache: true,
			preload: true,
			accessibility: true,
			updateHead: true,
			updateBodyClass: false,
			globalInstance: true,
			// 滚动相关配置优化
			resolveUrl: (url) => url,
			animateHistoryBrowsing: false,
			skipPopStateHandling: (event) => {
				// 跳过锚点链接的处理，让浏览器原生处理
				return event.state && event.state.url && event.state.url.includes("#");
			},
		}),
		icon({
			include: astroIconInclude,
		}),
		expressiveCode({
			themes: [expressiveCodeConfig.darkTheme, expressiveCodeConfig.lightTheme],
			useDarkModeMediaQuery: false,
			themeCssSelector: (theme) => `[data-theme='${theme.name}']`,
			plugins: [
				pluginCollapsibleSections(),
				pluginLineNumbers(),
				// pluginLanguageBadge(),
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
		}),
		svelte(),
		sitemap({
			filter: (page) => {
				// 根据页面开关配置过滤sitemap
				const url = new URL(page);
				const pathname = url.pathname;

				if (pathname === "/sponsor/" && !siteConfig.pages.sponsor) {
					return false;
				}
				if (pathname === "/guestbook/" && !siteConfig.pages.guestbook) {
					return false;
				}
				if (pathname === "/bangumi/" && !siteConfig.pages.bangumi) {
					return false;
				}

				return true;
			},
		}),
		mdx(),
	],
	markdown: {
		remarkPlugins: [
			remarkMath,
			remarkReadingTime,
			remarkExcerpt,
			[
                remarkImageCaption,
                {
                    className: 'image-caption',
                },
            ],
            remarkImageWidth,
			remarkDirective,
			remarkSectionize,
			parseDirectiveNode,
			remarkMermaid,
		],
		rehypePlugins: [
			rehypeResponsiveImages,
			[rehypeKatex, { katex }],
			[rehypeCallouts, { theme: siteConfig.rehypeCallouts.theme }],
			rehypeSlug,
			rehypeMermaid,
			[rehypeEmailProtection, { method: "base64" }], // 邮箱保护插件，支持 'base64' 或 'rot13'
			[
				rehypeComponents,
				{
					components: {
						github: GithubCardComponent,
						"link-card": LinkCardComponent,
						note: (x, y) => AdmonitionComponent(x, y, "note"),
						tip: (x, y) => AdmonitionComponent(x, y, "tip"),
						important: (x, y) => AdmonitionComponent(x, y, "important"),
						caution: (x, y) => AdmonitionComponent(x, y, "caution"),
						warning: (x, y) => AdmonitionComponent(x, y, "warning"),
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
						children: [
							{
								type: "text",
								value: "#",
							},
						],
					},
				},
			],
		],
	},
	vite: {
		esbuild: {
			drop: ["debugger"],
		},
		server: {
			watch: {
				ignored: [
					"**/.git/**",
					"**/dist/**",
					"**/.vercel/**",
					"**/.astro/**",
					"**/node_modules/**",
					"**/.pnpm/**",
				],
			},
		},
		resolve: {
			alias: {
				"@rehype-callouts-theme": rehypeCalloutsTheme,
			},
		},
		build: {
			// 使用 esbuild 压缩，减少 Vercel 构建耗时
			minify: "esbuild",
			rollupOptions: {
				onwarn(warning, warn) {
					// temporarily suppress this warning
					if (
						warning.message.includes("is dynamically imported by") &&
						warning.message.includes("but also statically imported by")
					) {
						return;
					}
					warn(warning);
				},
			},
			// CSS 优化
			cssCodeSplit: true,
			cssMinify: true,
			// 资源大小限制 - 减少内联资源
			assetsInlineLimit: 4096,
			// 减少源映射大小（可选，生产环境改为false）
			sourcemap: false,
			// 并行处理构建
			workers: 4,
		},
	},
});
