export interface EditorPostInput {
	title: string;
	slug?: string;
	format?: "md" | "mdx" | string;
	description?: string;
	body?: string;
	published?: string;
	updated?: string;
	tags?: string[] | string;
	category?: string;
	lang?: string;
	image?: string;
	draft?: boolean;
	pinned?: boolean;
	comment?: boolean;
}

export interface NormalizedEditorPost {
	title: string;
	slug: string;
	format: "md" | "mdx";
	description: string;
	body: string;
	published: string;
	updated?: string;
	tags: string[];
	category: string;
	lang: string;
	image: string;
	draft: boolean;
	pinned: boolean;
	comment: boolean;
}

export interface RenderedEditorPreview {
	html: string;
	headings: Array<{ depth: number; slug: string; text: string }>;
	words: number;
	minutes: number;
	excerpt: string;
}
