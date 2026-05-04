/**
 * TOC (Table of Contents) 工具类
 * 用于 SidebarTOC 和 FloatingTOC 的共享逻辑
 */

export interface TOCConfig {
	contentId: string;
	indicatorId: string;
	maxLevel?: number;
	scrollOffset?: number;
}

const RESPONSIVE_IMAGE_SELECTOR =
	"img.md3-responsive-image, img.ff-theme-responsive-image";
const HEADING_ANCHOR_NAVIGATION_EVENT = "firefly:heading-anchor-navigation";
const HEADING_IMAGE_WAIT_TIMEOUT = 2200;
const HEADING_RELOAD_IMAGE_WAIT_TIMEOUT = 10000;
const HEADING_SCROLL_SETTLE_FALLBACK = 1400;
const HEADING_POST_SCROLL_IMAGE_MONITOR_TIMEOUT = 12000;
const ARTICLE_SCROLL_RESTORE_KEY = "firefly:article-scroll-restore";
const ARTICLE_SCROLL_RESTORE_MAX_AGE = 5 * 60 * 1000;
const USER_NAVIGATION_CANCEL_EVENTS = [
	"wheel",
	"touchstart",
	"pointerdown",
	"keydown",
] as const;

interface HeadingNavigationOptions {
	behavior?: ScrollBehavior;
	lockActive?: boolean;
	targetDelta?: number;
}

interface StoredArticleScroll {
	path: string;
	headingId: string;
	delta: number;
	scrollY: number;
	createdAt: number;
}

let headingAnchorClickEventsBound = false;
let articleScrollRestoreEventsBound = false;
let initialNavigationKey = "";

function bindGlobalHeadingAnchorClickEvents(): void {
	if (headingAnchorClickEventsBound) {
		return;
	}

	document.addEventListener("click", (event) => {
		if (
			event instanceof MouseEvent &&
			(event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey)
		) {
			return;
		}

		const target = event.target as Element | null;
		const anchor = target?.closest(
			".custom-md .anchor[href^='#']",
		) as HTMLAnchorElement | null;
		if (!anchor) {
			return;
		}

		const id = decodeURIComponent(anchor.getAttribute("href")?.slice(1) || "");
		if (!id || !document.getElementById(id)) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
		document.dispatchEvent(
			new CustomEvent(HEADING_ANCHOR_NAVIGATION_EVENT, {
				detail: { id },
				cancelable: true,
			}),
		);
	});

	headingAnchorClickEventsBound = true;
}

function isReloadNavigation(): boolean {
	const navigationEntry = performance.getEntriesByType("navigation")[0] as
		| PerformanceNavigationTiming
		| undefined;
	return navigationEntry?.type === "reload";
}

function getHeadingImageWaitTimeout(): number {
	return isReloadNavigation()
		? HEADING_RELOAD_IMAGE_WAIT_TIMEOUT
		: HEADING_IMAGE_WAIT_TIMEOUT;
}

function getPageRestorePath(): string {
	return `${window.location.pathname}${window.location.search}`;
}

function getHeadingScrollOffset(
	targetElement: HTMLElement,
	fallbackOffset: number,
): number {
	const scrollMarginTop = Number.parseFloat(
		getComputedStyle(targetElement).scrollMarginTop,
	);

	if (Number.isFinite(scrollMarginTop) && scrollMarginTop > 0) {
		return scrollMarginTop;
	}

	const navbar =
		document.getElementById("navbar-wrapper") || document.getElementById("navbar");
	const navbarBottom = navbar?.getBoundingClientRect().bottom ?? 0;

	if (Number.isFinite(navbarBottom) && navbarBottom > 0) {
		return Math.max(fallbackOffset, navbarBottom + 16);
	}

	return fallbackOffset;
}

function getContentContainer(): Element | null {
	return (
		document.querySelector(".custom-md") ||
		document.querySelector(".prose") ||
		document.querySelector(".markdown-content")
	);
}

function getArticleHeadings(): HTMLElement[] {
	return Array.from(
		(getContentContainer() || document).querySelectorAll<HTMLElement>(
			"h1, h2, h3, h4, h5, h6",
		),
	).filter((heading) => Boolean(heading.id));
}

function getCurrentHashTargetId(): string {
	const rawHash = window.location.hash.slice(1);
	if (!rawHash) {
		return "";
	}

	try {
		return decodeURIComponent(rawHash);
	} catch {
		return rawHash;
	}
}

function findScrollRestoreHeading(fallbackOffset: number): HTMLElement | null {
	const headings = getArticleHeadings();
	if (headings.length === 0) {
		return null;
	}

	let restoreHeading = headings[0];
	for (const heading of headings) {
		const offset = getHeadingScrollOffset(heading, fallbackOffset);
		if (heading.getBoundingClientRect().top - offset <= 1) {
			restoreHeading = heading;
			continue;
		}
		break;
	}

	return restoreHeading;
}

function readStoredArticleScroll(): StoredArticleScroll | null {
	try {
		const raw = window.sessionStorage.getItem(ARTICLE_SCROLL_RESTORE_KEY);
		if (!raw) {
			return null;
		}

		const parsed = JSON.parse(raw) as Partial<StoredArticleScroll>;
		if (
			typeof parsed.path !== "string" ||
			typeof parsed.headingId !== "string" ||
			typeof parsed.delta !== "number" ||
			typeof parsed.scrollY !== "number" ||
			typeof parsed.createdAt !== "number"
		) {
			return null;
		}

		if (Date.now() - parsed.createdAt > ARTICLE_SCROLL_RESTORE_MAX_AGE) {
			return null;
		}

		return parsed as StoredArticleScroll;
	} catch {
		return null;
	}
}

function writeStoredArticleScroll(fallbackOffset: number): void {
	if (!window.location.pathname.includes("/posts/")) {
		return;
	}

	if (window.scrollY <= 1) {
		try {
			window.sessionStorage.removeItem(ARTICLE_SCROLL_RESTORE_KEY);
		} catch {
			// Ignore storage failures in private browsing modes.
		}
		return;
	}

	const heading = findScrollRestoreHeading(fallbackOffset);
	if (!heading?.id) {
		return;
	}

	const offset = getHeadingScrollOffset(heading, fallbackOffset);
	const payload: StoredArticleScroll = {
		path: getPageRestorePath(),
		headingId: heading.id,
		delta: heading.getBoundingClientRect().top - offset,
		scrollY: window.scrollY,
		createdAt: Date.now(),
	};

	try {
		window.sessionStorage.setItem(
			ARTICLE_SCROLL_RESTORE_KEY,
			JSON.stringify(payload),
		);
	} catch {
		// Ignore storage failures in private browsing modes.
	}
}

function bindArticleScrollRestoreEvents(fallbackOffset: number): void {
	if (articleScrollRestoreEventsBound) {
		return;
	}

	const save = () => writeStoredArticleScroll(fallbackOffset);
	window.addEventListener("pagehide", save);
	window.addEventListener("beforeunload", save);
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") {
			save();
		}
	});
	articleScrollRestoreEventsBound = true;
}

export class TOCManager {
	private tocItems: HTMLElement[] = [];
	private observer: IntersectionObserver | null = null;
	private minDepth = 10;
	private maxLevel: number;
	private scrollTimeout: number | null = null;
	private contentId: string;
	private indicatorId: string;
	private scrollOffset: number;
	private activeHeadingKey = "";
	private programmaticScrollTargetId: string | null = null;
	private programmaticScrollTimeout: number | null = null;
	private navigationToken = 0;
	private handleHeadingAnchorNavigation = (event: Event) => {
		if (event.defaultPrevented) {
			return;
		}

		const id = (event as CustomEvent<{ id?: string }>).detail?.id;
		const targetElement = id ? document.getElementById(id) : null;
		if (!targetElement) {
			return;
		}

		event.preventDefault();
		this.navigateToHeading(targetElement);
	};

	constructor(config: TOCConfig) {
		this.contentId = config.contentId;
		this.indicatorId = config.indicatorId;
		this.maxLevel = config.maxLevel || 3;
		this.scrollOffset = config.scrollOffset || 80;
	}

	private getScrollOffset(targetElement: HTMLElement): number {
		return getHeadingScrollOffset(targetElement, this.scrollOffset);
	}

	private getHeadingTargetTop(
		targetElement: HTMLElement,
		targetDelta = 0,
	): number {
		return (
			targetElement.getBoundingClientRect().top +
			window.pageYOffset -
			this.getScrollOffset(targetElement) -
			targetDelta
		);
	}

	private scrollToHeading(
		targetElement: HTMLElement,
		behavior: ScrollBehavior = "smooth",
		targetDelta = 0,
	): void {
		window.scrollTo({
			top: this.getHeadingTargetTop(targetElement, targetDelta),
			behavior,
		});
	}

	private isResponsiveImageReady(img: HTMLImageElement): boolean {
		return img.dataset.ffMd3ImageReady === "true" || img.complete;
	}

	private isBeforeTarget(element: Element, targetElement: HTMLElement): boolean {
		return Boolean(
			element.compareDocumentPosition(targetElement) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		);
	}

	private getPendingImagesBeforeHeading(targetElement: HTMLElement) {
		return this.getImagesBeforeHeading(targetElement).filter(
			(img) => !this.isResponsiveImageReady(img),
		);
	}

	private getImagesBeforeHeading(targetElement: HTMLElement) {
		const contentContainer =
			targetElement.closest(".custom-md") || document.documentElement;

		return Array.from(
			contentContainer.querySelectorAll<HTMLImageElement>(
				RESPONSIVE_IMAGE_SELECTOR,
			),
		).filter((img) => this.isBeforeTarget(img, targetElement));
	}

	private waitForImagesBeforeHeading(targetElement: HTMLElement): Promise<void> {
		const pendingImages = this.getPendingImagesBeforeHeading(targetElement);
		if (pendingImages.length === 0) {
			return Promise.resolve();
		}

		const pending = new Set(pendingImages);
		return new Promise((resolve) => {
			let timeoutId: number | null = null;
			let finished = false;

			const cleanup = () => {
				if (timeoutId) {
					window.clearTimeout(timeoutId);
					timeoutId = null;
				}
				pendingImages.forEach((img) => {
					img.removeEventListener("load", handleImageDone);
					img.removeEventListener("error", handleImageDone);
				});
			};

			const finish = () => {
				if (finished) {
					return;
				}
				finished = true;
				cleanup();
				window.requestAnimationFrame(() => {
					window.requestAnimationFrame(() => resolve());
				});
			};

			function handleImageDone(event: Event) {
				pending.delete(event.currentTarget as HTMLImageElement);
				if (pending.size === 0) {
					finish();
				}
			}

			timeoutId = window.setTimeout(finish, getHeadingImageWaitTimeout());

			pendingImages.forEach((img) => {
				img.loading = "eager";
				img.addEventListener("load", handleImageDone);
				img.addEventListener("error", handleImageDone);
				if (this.isResponsiveImageReady(img)) {
					pending.delete(img);
				}
			});

			if (pending.size === 0) {
				finish();
			}
		});
	}

	private prepareImagesBeforeHeading(targetElement: HTMLElement): void {
		const pendingImages = this.getPendingImagesBeforeHeading(targetElement);
		pendingImages.forEach((img) => {
			img.loading = "eager";
		});
	}

	private correctHeadingScrollToTarget(
		targetElement: HTMLElement,
		targetDelta = 0,
	): boolean {
		const delta =
			targetElement.getBoundingClientRect().top -
			this.getScrollOffset(targetElement) -
			targetDelta;
		if (Math.abs(delta) < 0.5) {
			return false;
		}

		window.scrollBy({
			top: delta,
			behavior: "auto",
		});
		return true;
	}

	private correctHeadingAfterScrollSettles(
		targetElement: HTMLElement,
		token: number,
		targetDelta = 0,
	): void {
		let timeoutId = 0;
		let settled = false;

		const cleanup = () => {
			if (settled) {
				return;
			}

			settled = true;
			if (timeoutId) {
				window.clearTimeout(timeoutId);
				timeoutId = 0;
			}
			window.removeEventListener("scrollend", finish);
			USER_NAVIGATION_CANCEL_EVENTS.forEach((eventName) => {
				window.removeEventListener(eventName, cancel, { capture: true });
			});
		};

		const finish = () => {
			if (settled) {
				return;
			}
			cleanup();

			window.requestAnimationFrame(() => {
				if (
					token !== this.navigationToken ||
					!document.contains(targetElement)
				) {
					return;
				}

				window.requestAnimationFrame(() => {
					if (
						token !== this.navigationToken ||
						!document.contains(targetElement)
					) {
						return;
					}
					this.correctHeadingScrollToTarget(targetElement, targetDelta);
				});
			});
		};

		const cancel = () => {
			if (token === this.navigationToken) {
				this.navigationToken++;
			}
			cleanup();
		};

		timeoutId = window.setTimeout(finish, HEADING_SCROLL_SETTLE_FALLBACK);
		window.addEventListener("scrollend", finish, { once: true });
		USER_NAVIGATION_CANCEL_EVENTS.forEach((eventName) => {
			window.addEventListener(eventName, cancel, {
				capture: true,
				passive: true,
			});
		});
	}

	private waitForImagesAfterHeadingScroll(
		targetElement: HTMLElement,
		token: number,
		targetDelta = 0,
	): void {
		const pendingImages = this.getPendingImagesBeforeHeading(targetElement);
		if (pendingImages.length === 0) {
			return;
		}

		const pending = new Set(pendingImages);
		let correctionTimer = 0;
		let timeoutId = 0;
		const cleanup = () => {
			if (timeoutId) {
				window.clearTimeout(timeoutId);
				timeoutId = 0;
			}
			pendingImages.forEach((img) => {
				img.removeEventListener("load", handleImageDone);
				img.removeEventListener("error", handleImageDone);
			});
		};

		const scheduleCorrection = () => {
			if (correctionTimer) {
				return;
			}

			correctionTimer = window.setTimeout(() => {
				correctionTimer = 0;
				if (
					token !== this.navigationToken ||
					!document.contains(targetElement)
				) {
					cleanup();
					return;
				}

				this.correctHeadingAfterScrollSettles(
					targetElement,
					token,
					targetDelta,
				);
			}, 80);
		};

		const handleImageDone = (event: Event) => {
			pending.delete(event.currentTarget as HTMLImageElement);
			scheduleCorrection();
			if (pending.size === 0) {
				cleanup();
			}
		};

		pendingImages.forEach((img) => {
			img.loading = "eager";
			img.addEventListener("load", handleImageDone);
			img.addEventListener("error", handleImageDone);
			if (this.isResponsiveImageReady(img)) {
				pending.delete(img);
				scheduleCorrection();
			}
		});
		if (pending.size === 0) {
			cleanup();
			return;
		}
		timeoutId = window.setTimeout(
			cleanup,
			Math.max(
				getHeadingImageWaitTimeout(),
				HEADING_POST_SCROLL_IMAGE_MONITOR_TIMEOUT,
			),
		);
	}

	private bindNavigationCancel(token: number): () => void {
		const cancel = () => {
			if (token === this.navigationToken) {
				this.navigationToken++;
			}
			USER_NAVIGATION_CANCEL_EVENTS.forEach((eventName) => {
				window.removeEventListener(eventName, cancel, { capture: true });
			});
		};

		USER_NAVIGATION_CANCEL_EVENTS.forEach((eventName) => {
			window.addEventListener(eventName, cancel, {
				capture: true,
				passive: true,
			});
		});

		return () => {
			USER_NAVIGATION_CANCEL_EVENTS.forEach((eventName) => {
				window.removeEventListener(eventName, cancel, { capture: true });
			});
		};
	}

	private async navigateToHeading(
		targetElement: HTMLElement,
		options: HeadingNavigationOptions = {},
	): Promise<void> {
		const {
			behavior = "smooth",
			lockActive = true,
			targetDelta = 0,
		} = options;
		const token = ++this.navigationToken;
		const releaseCancel = this.bindNavigationCancel(token);
		this.prepareImagesBeforeHeading(targetElement);
		await this.waitForImagesBeforeHeading(targetElement);
		releaseCancel();
		if (token !== this.navigationToken || !document.contains(targetElement)) {
			return;
		}
		window.requestAnimationFrame(() => {
			if (token !== this.navigationToken || !document.contains(targetElement)) {
				return;
			}

			window.requestAnimationFrame(() => {
				if (
					token !== this.navigationToken ||
					!document.contains(targetElement)
				) {
					return;
				}
				if (lockActive) {
					this.lockProgrammaticScrollTarget(targetElement);
				}
				this.scrollToHeading(targetElement, behavior, targetDelta);
				this.correctHeadingAfterScrollSettles(
					targetElement,
					token,
					targetDelta,
				);
				this.waitForImagesAfterHeadingScroll(
					targetElement,
					token,
					targetDelta,
				);
			});
		});
	}

	private scheduleInitialNavigation(): void {
		const hashTargetId = getCurrentHashTargetId();
		if (hashTargetId) {
			const targetElement = document.getElementById(hashTargetId);
			if (!targetElement) {
				return;
			}

			const key = `${getPageRestorePath()}#${hashTargetId}`;
			if (initialNavigationKey === key) {
				return;
			}
			initialNavigationKey = key;

			window.requestAnimationFrame(() => {
				this.navigateToHeading(targetElement, {
					behavior: "auto",
					lockActive: false,
				});
			});
			return;
		}

		if (!isReloadNavigation()) {
			return;
		}

		const stored = readStoredArticleScroll();
		if (!stored || stored.path !== getPageRestorePath()) {
			return;
		}

		const targetElement = document.getElementById(stored.headingId);
		if (!targetElement) {
			return;
		}

		const key = `${stored.path}:${stored.headingId}:${Math.round(stored.scrollY)}`;
		if (initialNavigationKey === key) {
			return;
		}
		initialNavigationKey = key;

		window.requestAnimationFrame(() => {
			this.navigateToHeading(targetElement, {
				behavior: "auto",
				lockActive: false,
				targetDelta: stored.delta,
			});
		});
	}

	private lockProgrammaticScrollTarget(targetElement: HTMLElement): void {
		if (!targetElement.id) {
			return;
		}

		this.programmaticScrollTargetId = targetElement.id;
		this.applyActiveItems(
			this.tocItems.filter((item) => item.dataset.headingId === targetElement.id),
		);

		if (this.programmaticScrollTimeout) {
			window.clearTimeout(this.programmaticScrollTimeout);
			this.programmaticScrollTimeout = null;
		}

		const release = () => {
			if (this.programmaticScrollTimeout) {
				window.clearTimeout(this.programmaticScrollTimeout);
				this.programmaticScrollTimeout = null;
			}
			if (this.programmaticScrollTargetId === targetElement.id) {
				this.programmaticScrollTargetId = null;
				this.updateActiveState();
			}
			window.removeEventListener("scrollend", release);
		};

		window.addEventListener("scrollend", release, { once: true });
		this.programmaticScrollTimeout = window.setTimeout(release, 4200);
	}

	private applyActiveItems(activeItems: HTMLElement[]): void {
		const nextActiveHeadingKey = activeItems
			.map((item) => item.dataset.headingId || "")
			.join("|");

		if (nextActiveHeadingKey === this.activeHeadingKey) {
			return;
		}

		this.activeHeadingKey = nextActiveHeadingKey;
		this.tocItems.forEach((item) => {
			item.classList.remove("visible");
		});
		activeItems.forEach((item) => {
			item.classList.add("visible");
		});
		this.updateActiveIndicator(activeItems);
	}

	/**
	 * 查找文章内容容器
	 */
	private getContentContainer(): Element | null {
		return (
			document.querySelector(".custom-md") ||
			document.querySelector(".prose") ||
			document.querySelector(".markdown-content")
		);
	}

	/**
	 * 查找所有标题
	 */
	private getAllHeadings(): NodeListOf<HTMLElement> {
		const contentContainer = this.getContentContainer();
		if (contentContainer) {
			return contentContainer.querySelectorAll("h1, h2, h3, h4, h5, h6");
		}
		return document.querySelectorAll("h1, h2, h3, h4, h5, h6");
	}

	/**
	 * 计算最小深度
	 */
	private calculateMinDepth(headings: NodeListOf<HTMLElement>): number {
		let minDepth = 10;
		headings.forEach((heading) => {
			const depth = Number.parseInt(heading.tagName.charAt(1), 10);
			minDepth = Math.min(minDepth, depth);
		});
		return minDepth;
	}

	/**
	 * 过滤标题
	 */
	private filterHeadings(headings: NodeListOf<HTMLElement>): HTMLElement[] {
		return Array.from(headings).filter((heading) => {
			const depth = Number.parseInt(heading.tagName.charAt(1), 10);
			return depth < this.minDepth + this.maxLevel;
		});
	}

	/**
	 * 生成徽章内容
	 */
	private generateBadgeContent(depth: number, heading1Count: number): string {
		if (depth === this.minDepth) {
			return heading1Count.toString();
		}
		if (depth === this.minDepth + 1) {
			return '<div class="transition w-2 h-2 rounded-[0.1875rem] bg-[var(--toc-badge-bg)]"></div>';
		}
		return '<div class="transition w-1.5 h-1.5 rounded-sm bg-black/5 dark:bg-white/10"></div>';
	}

	/**
	 * 生成TOC HTML
	 */
	public generateTOCHTML(): string {
		const headings = this.getAllHeadings();

		if (headings.length === 0) {
			return '<div class="text-center py-8 text-gray-500 dark:text-gray-400"><p>当前页面没有目录</p></div>';
		}

		this.minDepth = this.calculateMinDepth(headings);
		const filteredHeadings = this.filterHeadings(headings);

		if (filteredHeadings.length === 0) {
			return '<div class="text-center py-8 text-gray-500 dark:text-gray-400"><p>当前页面没有目录</p></div>';
		}

		let tocHTML = "";
		let heading1Count = 1;

		filteredHeadings.forEach((heading) => {
			const depth = Number.parseInt(heading.tagName.charAt(1), 10);
			const depthClass =
				depth === this.minDepth
					? ""
					: depth === this.minDepth + 1
						? "pl-4"
						: "pl-8";

			if (!heading.id) {
				return;
			}

			const badgeContent = this.generateBadgeContent(depth, heading1Count);
			if (depth === this.minDepth) {
				heading1Count++;
			}

			const headingText = (heading.textContent || "").replace(/#+\s*$/, "");

			tocHTML += `
        <a 
          href="#${heading.id}" 
          class="px-2 flex gap-2 relative transition w-full min-h-9 rounded-xl hover:bg-[var(--toc-btn-hover)] active:bg-[var(--toc-btn-active)] py-2 ${depthClass}"
          data-heading-id="${heading.id}"
        >
          <div class="transition w-5 h-5 shrink-0 rounded-lg text-xs flex items-center justify-center font-bold ${depth === this.minDepth ? "bg-[var(--toc-badge-bg)] text-[var(--btn-content)]" : ""}">
            ${badgeContent}
          </div>
          <div class="transition text-sm ${depth <= this.minDepth + 1 ? "text-50" : "text-30"} flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">${headingText}</div>
        </a>
      `;
		});

		tocHTML += `<div id="${this.indicatorId}" style="opacity: 0;" class="-z-10 absolute bg-[var(--toc-btn-hover)] left-0 right-0 rounded-xl transition-all"></div>`;

		return tocHTML;
	}

	/**
	 * 更新TOC内容
	 */
	public updateTOCContent(): void {
		const tocContent = document.getElementById(this.contentId);
		if (!tocContent) return;

		tocContent.innerHTML = this.generateTOCHTML();
		this.tocItems = Array.from(
			document.querySelectorAll(`#${this.contentId} a`),
		);
		this.activeHeadingKey = "";
	}

	/**
	 * 获取可见的标题ID
	 */
	private getVisibleHeadingIds(): string[] {
		const headings = this.getAllHeadings();
		const visibleHeadingIds: string[] = [];

		headings.forEach((heading) => {
			if (heading.id) {
				const rect = heading.getBoundingClientRect();
				const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

				if (isVisible) {
					visibleHeadingIds.push(heading.id);
				}
			}
		});

		// 如果没有可见标题，选择最接近屏幕顶部的标题
		if (visibleHeadingIds.length === 0 && headings.length > 0) {
			let closestHeading: string | null = null;
			let minDistance = Number.POSITIVE_INFINITY;

			headings.forEach((heading) => {
				if (heading.id) {
					const rect = heading.getBoundingClientRect();
					const distance = Math.abs(rect.top);

					if (distance < minDistance) {
						minDistance = distance;
						closestHeading = heading.id;
					}
				}
			});

			if (closestHeading) {
				visibleHeadingIds.push(closestHeading);
			}
		}

		return visibleHeadingIds;
	}

	/**
	 * 更新活动状态
	 */
	public updateActiveState(): void {
		if (!this.tocItems || this.tocItems.length === 0) return;

		if (this.programmaticScrollTargetId) {
			this.applyActiveItems(
				this.tocItems.filter(
					(item) => item.dataset.headingId === this.programmaticScrollTargetId,
				),
			);
			return;
		}

		const visibleHeadingIds = this.getVisibleHeadingIds();

		// 找到对应的TOC项并添加活动状态
		const activeItems = this.tocItems.filter((item) => {
			const headingId = item.dataset.headingId;
			return headingId && visibleHeadingIds.includes(headingId);
		});

		this.applyActiveItems(activeItems);
	}

	/**
	 * 更新活动指示器
	 */
	private updateActiveIndicator(activeItems: HTMLElement[]): void {
		const indicator = document.getElementById(this.indicatorId);
		if (!indicator || !this.tocItems.length) return;

		if (activeItems.length === 0) {
			indicator.style.opacity = "0";
			return;
		}

		const tocContent = document.getElementById(this.contentId);
		if (!tocContent) return;

		const contentRect = tocContent.getBoundingClientRect();
		const firstActive = activeItems[0];
		const lastActive = activeItems[activeItems.length - 1];

		const firstRect = firstActive.getBoundingClientRect();
		const lastRect = lastActive.getBoundingClientRect();

		const top = firstRect.top - contentRect.top;
		const height = lastRect.bottom - firstRect.top;

		indicator.style.top = `${top}px`;
		indicator.style.height = `${height}px`;
		indicator.style.opacity = "1";

		// 自动滚动到活动项
		if (firstActive) {
			this.scrollToActiveItem(firstActive);
		}
	}

	/**
	 * 滚动到活动项
	 */
	private scrollToActiveItem(activeItem: HTMLElement): void {
		if (!activeItem) return;

		const tocContainer = document
			.querySelector(`#${this.contentId}`)
			?.closest(".toc-scroll-container");
		if (!tocContainer) return;

		// 清除之前的定时器
		if (this.scrollTimeout) {
			clearTimeout(this.scrollTimeout);
		}

		// 使用节流机制
		this.scrollTimeout = window.setTimeout(() => {
			const containerRect = tocContainer.getBoundingClientRect();
			const itemRect = activeItem.getBoundingClientRect();

			// 只在元素不在可视区域时才滚动
			const isVisible =
				itemRect.top >= containerRect.top &&
				itemRect.bottom <= containerRect.bottom;

			if (!isVisible) {
				const itemOffsetTop = (activeItem as HTMLElement).offsetTop;
				const containerHeight = tocContainer.clientHeight;
				const itemHeight = activeItem.clientHeight;

				// 计算目标滚动位置，将元素居中显示
				const targetScroll =
					itemOffsetTop - containerHeight / 2 + itemHeight / 2;

				tocContainer.scrollTo({
					top: targetScroll,
					behavior: "smooth",
				});
			}
		}, 100);
	}

	/**
	 * 处理点击事件
	 */
	public handleClick(event: Event): void {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();

		const target = event.currentTarget as HTMLAnchorElement;
		const id = decodeURIComponent(
			target.getAttribute("href")?.substring(1) || "",
		);
		const targetElement = document.getElementById(id);

		if (targetElement) {
			this.navigateToHeading(targetElement);
		}
	}

	/**
	 * 设置IntersectionObserver
	 */
	public setupObserver(): void {
		const headings = this.getAllHeadings();

		if (this.observer) {
			this.observer.disconnect();
		}

		this.observer = new IntersectionObserver(
			() => {
				this.updateActiveState();
			},
			{
				rootMargin: "0px 0px 0px 0px",
				threshold: 0,
			},
		);

		headings.forEach((heading) => {
			if (heading.id) {
				this.observer?.observe(heading);
			}
		});
	}

	/**
	 * 绑定点击事件
	 */
	public bindClickEvents(): void {
		this.tocItems.forEach((item) => {
			item.addEventListener("click", this.handleClick.bind(this));
		});
	}

	/**
	 * 清理
	 */
	public cleanup(): void {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
		if (this.scrollTimeout) {
			clearTimeout(this.scrollTimeout);
			this.scrollTimeout = null;
		}
		if (this.programmaticScrollTimeout) {
			window.clearTimeout(this.programmaticScrollTimeout);
			this.programmaticScrollTimeout = null;
		}
		this.programmaticScrollTargetId = null;
		document.removeEventListener(
			HEADING_ANCHOR_NAVIGATION_EVENT,
			this.handleHeadingAnchorNavigation,
		);
	}

	/**
	 * 初始化
	 */
	public init(): void {
		bindGlobalHeadingAnchorClickEvents();
		bindArticleScrollRestoreEvents(this.scrollOffset);
		document.addEventListener(
			HEADING_ANCHOR_NAVIGATION_EVENT,
			this.handleHeadingAnchorNavigation,
		);
		this.updateTOCContent();
		this.bindClickEvents();
		this.setupObserver();
		this.updateActiveState();
		this.scheduleInitialNavigation();
	}
}

/**
 * 检查是否为文章页面
 */
export function isPostPage(): boolean {
	return window.location.pathname.includes("/posts/");
}
