/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare global {
	interface ImportMetaEnv {
		readonly MEILI_MASTER_KEY: string;
		readonly EDITOR_PASSWORD?: string;
		readonly EDITOR_SESSION_SECRET?: string;
		readonly EDITOR_SESSION_TTL_SECONDS?: string;
		readonly EDITOR_GITHUB_TOKEN?: string;
		readonly EDITOR_GITHUB_OWNER?: string;
		readonly EDITOR_GITHUB_REPO?: string;
		readonly EDITOR_GITHUB_BRANCH?: string;
		readonly EDITOR_POSTS_DIR?: string;
		readonly EDITOR_GITHUB_COMMITTER_NAME?: string;
		readonly EDITOR_GITHUB_COMMITTER_EMAIL?: string;
	}

	interface ITOCManager {
		init: () => void;
		cleanup: () => void;
	}

	interface Window {
		SidebarTOC: {
			manager: ITOCManager | null;
		};
		FloatingTOC: {
			btn: HTMLElement | null;
			panel: HTMLElement | null;
			manager: ITOCManager | null;
			isPostPage: () => boolean;
		};
		toggleFloatingTOC: () => void;
		tocInternalNavigation: boolean;
		iconifyLoaded: boolean;
		// swup is defined in global.d.ts
		// biome-ignore lint/suspicious/noExplicitAny: External library without types
		spine: any;
		closeAnnouncement: () => void;
		// biome-ignore lint/suspicious/noExplicitAny: External library without types
		__iconifyLoader: any;
		__iconifyLoaderInitialized: boolean;
		loadIconify: () => Promise<void>;
		preloadIcons: (icons: string | string[]) => void;
		onIconifyReady: (callback: () => void) => void;
	}
}

export {};
