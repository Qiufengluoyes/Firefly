import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";
import * as fs from "node:fs";
import * as path from "node:path";
import { brotliDecompressSync } from "node:zlib";
import type { APIContext, GetStaticPaths } from "astro";
import type { ReactNode } from "react";
import satori from "satori";
import sharp from "sharp";
import { removeFileExtension } from "@/utils/url-utils";

import { profileConfig } from "../../config/profileConfig";
import { siteConfig } from "../../config/siteConfig";

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

type FontStyle = "normal" | "italic";
interface FontOptions {
	data: Buffer | ArrayBuffer;
	name: string;
	weight?: Weight;
	style?: FontStyle;
	lang?: string;
}
export const prerender = true;

const OG_FONT_FAMILY = "MiSans";

const MI_SANS_FONT_SOURCES: Array<{ directory: string; weight: Weight }> = [
	{ directory: "medium", weight: 500 },
	{ directory: "demibold", weight: 600 },
];

const WOFF2_KNOWN_TAGS = [
	"cmap",
	"head",
	"hhea",
	"hmtx",
	"maxp",
	"name",
	"OS/2",
	"post",
	"cvt ",
	"fpgm",
	"glyf",
	"loca",
	"prep",
	"CFF ",
	"VORG",
	"EBDT",
	"EBLC",
	"gasp",
	"hdmx",
	"kern",
	"LTSH",
	"PCLT",
	"VDMX",
	"vhea",
	"vmtx",
	"BASE",
	"GDEF",
	"GPOS",
	"GSUB",
	"EBSC",
	"JSTF",
	"MATH",
	"CBDT",
	"CBLC",
	"COLR",
	"CPAL",
	"SVG ",
	"sbix",
	"acnt",
	"avar",
	"bdat",
	"bloc",
	"bsln",
	"cvar",
	"fdsc",
	"feat",
	"fmtx",
	"fvar",
	"gvar",
	"hsty",
	"just",
	"lcar",
	"mort",
	"morx",
	"opbd",
	"prop",
	"trak",
	"Zapf",
	"Silf",
	"Glat",
	"Gloc",
	"Feat",
	"Sill",
] as const;

interface LocalFontSource {
	filePath: string;
	unicodeRanges: Array<[number, number]>;
	weight: Weight;
	data?: Buffer;
}

interface Woff2TableRecord {
	tag: string;
	length: number;
	data: Buffer;
	offset: number;
	checksum: number;
}

let miSansFontSourcesCache: LocalFontSource[] | null = null;

function parseUnicodeRanges(rangeText: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];

	for (const range of rangeText.split(",")) {
		const normalizedRange = range.trim().replace(/^U\+/i, "");
		if (!normalizedRange) continue;

		const [startText, endText] = normalizedRange.split("-");
		const start = Number.parseInt(startText, 16);
		const end = endText ? Number.parseInt(endText, 16) : start;

		if (!Number.isNaN(start) && !Number.isNaN(end)) {
			ranges.push([start, end]);
		}
	}

	return ranges;
}

function loadFontSourcesFromCss(
	cssPath: string,
	fontDir: string,
	weight: Weight,
): LocalFontSource[] {
	const cssText = fs.readFileSync(cssPath, "utf8");
	const fontFaceBlocks = cssText.match(/@font-face\s*{[^}]+}/g) ?? [];

	return fontFaceBlocks.flatMap((block) => {
		const urlMatch = block.match(/url\(["']?\.\/([^"')]+)["']?\)\s*format/i);
		const rangeMatch = block.match(/unicode-range:\s*([^;]+);/i);

		if (!urlMatch || !rangeMatch) return [];

		return [
			{
				filePath: path.join(fontDir, urlMatch[1]),
				unicodeRanges: parseUnicodeRanges(rangeMatch[1]),
				weight,
			},
		];
	});
}

function loadMiSansFontSources() {
	if (miSansFontSourcesCache) return miSansFontSourcesCache;

	const publicFontDir = path.join(process.cwd(), "public", "fonts");
	miSansFontSourcesCache = MI_SANS_FONT_SOURCES.flatMap(
		({ directory, weight }) => {
			const fontDir = path.join(publicFontDir, directory);
			return loadFontSourcesFromCss(
				path.join(fontDir, "result.css"),
				fontDir,
				weight,
			);
		},
	);

	return miSansFontSourcesCache;
}

function collectTextCodePoints(texts: Array<string | undefined | null>) {
	const codePoints = new Set<number>();

	for (const text of texts) {
		if (!text) continue;

		for (const char of Array.from(text)) {
			const codePoint = char.codePointAt(0);
			if (typeof codePoint === "number") {
				codePoints.add(codePoint);
			}
		}
	}

	return codePoints;
}

function fontSourceCoversCodePoint(
	source: LocalFontSource,
	codePoint: number,
) {
	return source.unicodeRanges.some(
		([start, end]) => codePoint >= start && codePoint <= end,
	);
}

function fontSourceMatchesText(
	source: LocalFontSource,
	codePoints: Set<number>,
) {
	for (const codePoint of codePoints) {
		if (fontSourceCoversCodePoint(source, codePoint)) {
			return true;
		}
	}

	return false;
}

function loadMiSansFontsForText(
	texts: Array<string | undefined | null>,
): FontOptions[] {
	const codePoints = collectTextCodePoints(texts);
	const fonts: FontOptions[] = [];

	for (const source of loadMiSansFontSources()) {
		if (!fontSourceMatchesText(source, codePoints)) continue;

		source.data ??= convertWoff2ToSfnt(fs.readFileSync(source.filePath));
		fonts.push({
			name: OG_FONT_FAMILY,
			data: source.data,
			weight: source.weight,
			style: "normal",
		});
	}

	if (fonts.length === 0) {
		console.warn("No local MiSans subsets matched the OG text.");
	}

	return fonts;
}

function readBase128(input: Buffer, state: { position: number }) {
	let result = 0;

	for (let i = 0; i < 5; i++) {
		if (state.position >= input.length) {
			throw new Error("Invalid WOFF2 UIntBase128.");
		}

		const byte = input[state.position++];
		if (i === 0 && byte === 0x80) {
			throw new Error("Invalid WOFF2 UIntBase128 leading byte.");
		}

		if ((result & 0xfe000000) !== 0) {
			throw new Error("WOFF2 UIntBase128 overflow.");
		}

		result = (result << 7) | (byte & 0x7f);
		if ((byte & 0x80) === 0) return result >>> 0;
	}

	throw new Error("WOFF2 UIntBase128 exceeds five bytes.");
}

function pad4(length: number) {
	return (length + 3) & ~3;
}

function calculateChecksum(data: Buffer) {
	let sum = 0;
	const paddedLength = pad4(data.length);

	for (let i = 0; i < paddedLength; i += 4) {
		const b0 = i < data.length ? data[i] : 0;
		const b1 = i + 1 < data.length ? data[i + 1] : 0;
		const b2 = i + 2 < data.length ? data[i + 2] : 0;
		const b3 = i + 3 < data.length ? data[i + 3] : 0;
		const word = (((b0 << 24) >>> 0) + (b1 << 16) + (b2 << 8) + b3) >>> 0;
		sum = (sum + word) >>> 0;
	}

	return sum >>> 0;
}

function convertWoff2ToSfnt(input: Buffer) {
	if (input.toString("ascii", 0, 4) !== "wOF2") {
		throw new Error("Expected a WOFF2 font.");
	}

	const flavor = input.readUInt32BE(4);
	const numTables = input.readUInt16BE(12);
	const totalCompressedSize = input.readUInt32BE(20);
	const state = { position: 48 };
	const tables: Woff2TableRecord[] = [];

	for (let i = 0; i < numTables; i++) {
		const flags = input[state.position++];
		const tagIndex = flags & 0x3f;
		const transformVersion = flags >> 6;
		let tag: string | undefined;

		if (tagIndex === 0x3f) {
			tag = input.toString("ascii", state.position, state.position + 4);
			state.position += 4;
		} else {
			tag = WOFF2_KNOWN_TAGS[tagIndex];
		}

		if (!tag) {
			throw new Error(`Unknown WOFF2 table tag index: ${tagIndex}.`);
		}

		const length = readBase128(input, state);
		const transformed =
			tag === "glyf" || tag === "loca"
				? transformVersion !== 3
				: transformVersion !== 0;

		if (transformed) {
			readBase128(input, state);
			throw new Error(`Transformed WOFF2 table "${tag}" is not supported.`);
		}

		tables.push({
			tag,
			length,
			data: Buffer.alloc(0),
			offset: 0,
			checksum: 0,
		});
	}

	const compressedStart = state.position;
	const compressedEnd = compressedStart + totalCompressedSize;
	if (compressedEnd > input.length) {
		throw new Error("Invalid WOFF2 compressed data length.");
	}

	const decompressed = brotliDecompressSync(
		input.subarray(compressedStart, compressedEnd),
	);
	let decompressedOffset = 0;

	for (const table of tables) {
		const tableEnd = decompressedOffset + table.length;
		if (tableEnd > decompressed.length) {
			throw new Error(`WOFF2 table "${table.tag}" exceeds decompressed data.`);
		}

		table.data = Buffer.from(decompressed.subarray(decompressedOffset, tableEnd));
		decompressedOffset = tableEnd;
	}

	tables.sort((a, b) => {
		if (a.tag < b.tag) return -1;
		if (a.tag > b.tag) return 1;
		return 0;
	});

	const entrySelector = Math.floor(Math.log2(numTables));
	const searchRange = 16 * 2 ** entrySelector;
	const rangeShift = numTables * 16 - searchRange;
	let tableOffset = 12 + numTables * 16;

	for (const table of tables) {
		table.offset = tableOffset;
		tableOffset += pad4(table.length);
	}

	const output = Buffer.alloc(tableOffset);
	output.writeUInt32BE(flavor, 0);
	output.writeUInt16BE(numTables, 4);
	output.writeUInt16BE(searchRange, 6);
	output.writeUInt16BE(entrySelector, 8);
	output.writeUInt16BE(rangeShift, 10);

	for (const [index, table] of tables.entries()) {
		const tableData = table.tag === "head" ? Buffer.from(table.data) : table.data;
		if (table.tag === "head" && tableData.length >= 12) {
			tableData.writeUInt32BE(0, 8);
		}

		table.checksum = calculateChecksum(tableData);
		const directoryOffset = 12 + index * 16;

		output.write(table.tag, directoryOffset, 4, "ascii");
		output.writeUInt32BE(table.checksum, directoryOffset + 4);
		output.writeUInt32BE(table.offset, directoryOffset + 8);
		output.writeUInt32BE(table.length, directoryOffset + 12);
		tableData.copy(output, table.offset);
	}

	const headTable = tables.find((table) => table.tag === "head");
	if (headTable && headTable.length >= 12) {
		const adjustment = (0xb1b0afba - calculateChecksum(output)) >>> 0;
		output.writeUInt32BE(adjustment, headTable.offset + 8);
	}

	return output;
}

export const getStaticPaths: GetStaticPaths = async () => {
	if (!siteConfig.generateOgImages) {
		return [];
	}

	const allPosts = await getCollection("posts");
	const publishedPosts = allPosts.filter((post) => !post.data.draft);

	return publishedPosts.map((post) => {
		// 将 id 转换为 slug（移除扩展名）以匹配路由参数
		const slug = removeFileExtension(post.id);
		return {
			params: { slug },
			props: { post },
		};
	});
};

export async function GET({
	props,
}: APIContext<{ post: CollectionEntry<"posts"> }>): Promise<Response> {
	const { post } = props;

	// Avatar + icon: still read from disk (small assets)
	let avatarBase64: string;

	// 检查头像是否为 URL
	if (profileConfig.avatar?.startsWith("http")) {
		// 如果是 URL，直接使用
		avatarBase64 = profileConfig.avatar;
	} else {
		// 如果是本地路径，从 public 目录读取
		const avatarPath = profileConfig.avatar?.startsWith("/")
			? `./public${profileConfig.avatar}`
			: `./src/${profileConfig.avatar}`;
		const avatarBuffer = fs.readFileSync(avatarPath);
		avatarBase64 = `data:image/png;base64,${avatarBuffer.toString("base64")}`;
	}

	let iconPath = "./public/favicon/favicon-dark-192.png";
	if (siteConfig.favicon.length > 0) {
		iconPath = `./public${siteConfig.favicon[0].src}`;
	}
	const iconBuffer = fs.readFileSync(iconPath);
	const iconBase64 = `data:image/png;base64,${iconBuffer.toString("base64")}`;

	const hue = siteConfig.themeColor.hue;
	const primaryColor = `hsl(${hue}, 90%, 65%)`;
	const textColor = "hsl(0, 0%, 95%)";

	const subtleTextColor = `hsl(${hue}, 10%, 75%)`;
	const backgroundColor = `hsl(${hue}, 15%, 12%)`;

	const pubDate = post.data.published.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	const description = post.data.description;

	const fonts = loadMiSansFontsForText([
		siteConfig.title,
		post.data.title,
		description,
		profileConfig.name,
		pubDate,
	]);

	const template = {
		type: "div",
		props: {
			style: {
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				backgroundColor: backgroundColor,
				fontFamily: OG_FONT_FAMILY,
				fontWeight: 500,
				padding: "60px",
			},
			children: [
				{
					type: "div",
					props: {
						style: {
							width: "100%",
							display: "flex",
							alignItems: "center",
							gap: "20px",
						},
						children: [
							{
								type: "img",
								props: {
									src: iconBase64,
									width: 48,
									height: 48,
									style: { borderRadius: "10px" },
								},
							},
							{
								type: "div",
								props: {
									style: {
										fontSize: "36px",
										fontWeight: 600,
										color: subtleTextColor,
									},
									children: siteConfig.title,
								},
							},
						],
					},
				},

				{
					type: "div",
					props: {
						style: {
							display: "flex",
							flexDirection: "column",
							justifyContent: "center",
							flexGrow: 1,
							gap: "20px",
						},
						children: [
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										alignItems: "flex-start",
									},
									children: [
										{
											type: "div",
											props: {
												style: {
													width: "10px",
													height: "68px",
													backgroundColor: primaryColor,
													borderRadius: "6px",
													marginTop: "14px",
												},
											},
										},
										{
											type: "div",
											props: {
												style: {
													fontSize: "72px",
													fontWeight: 600,
													lineHeight: 1.2,
													color: textColor,
													marginLeft: "25px",
													display: "-webkit-box",
													overflow: "hidden",
													textOverflow: "ellipsis",
													lineClamp: 3,
													WebkitLineClamp: 3,
													WebkitBoxOrient: "vertical",
												},
												children: post.data.title,
											},
										},
									],
								},
							},
							description && {
								type: "div",
								props: {
									style: {
										fontSize: "32px",
										fontWeight: 500,
										lineHeight: 1.5,
										color: subtleTextColor,
										paddingLeft: "35px",
										display: "-webkit-box",
										overflow: "hidden",
										textOverflow: "ellipsis",
										lineClamp: 2,
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
									},
									children: description,
								},
							},
						],
					},
				},
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							width: "100%",
						},
						children: [
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										alignItems: "center",
										gap: "20px",
									},
									children: [
										{
											type: "img",
											props: {
												src: avatarBase64,
												width: 60,
												height: 60,
												style: { borderRadius: "50%" },
											},
										},
										{
											type: "div",
											props: {
												style: {
													fontSize: "28px",
													fontWeight: 600,
													color: textColor,
												},
												children: profileConfig.name,
											},
										},
									],
								},
							},
							{
								type: "div",
								props: {
									style: {
										fontSize: "28px",
										fontWeight: 500,
										color: subtleTextColor,
									},
									children: pubDate,
								},
							},
						],
					},
				},
			],
		},
	};

	const svg = await satori(template as unknown as ReactNode, {
		width: 1200,
		height: 630,
		fonts,
	});

	const png = await sharp(Buffer.from(svg)).png().toBuffer();

	return new Response(new Uint8Array(png), {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}
