import fs from "node:fs/promises";
import path from "node:path";

async function exists(targetPath) {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
}

async function syncPagefind() {
	const root = process.cwd();
	const sourceDir = path.join(root, "dist", "client", "pagefind");
	const distFallbackDir = path.join(root, "dist", "pagefind");
	const vercelStaticDir = path.join(root, ".vercel", "output", "static");
	const vercelTargetDir = path.join(vercelStaticDir, "pagefind");

	if (!(await exists(sourceDir))) {
		console.warn("[pagefind-sync] skipped: source not found:", sourceDir);
		return;
	}

	if (!(await exists(distFallbackDir))) {
		await fs.cp(sourceDir, distFallbackDir, { recursive: true });
		console.log("[pagefind-sync] copied to dist fallback:", distFallbackDir);
	}

	if (!(await exists(vercelStaticDir))) {
		console.log("[pagefind-sync] vercel output not found, skip:", vercelStaticDir);
		return;
	}

	await fs.rm(vercelTargetDir, { recursive: true, force: true });
	await fs.cp(sourceDir, vercelTargetDir, { recursive: true });
	console.log("[pagefind-sync] copied to vercel static:", vercelTargetDir);
}

syncPagefind().catch((error) => {
	console.error("[pagefind-sync] failed:", error);
	process.exitCode = 1;
});
