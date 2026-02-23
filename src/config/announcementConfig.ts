import type { AnnouncementConfig } from "../types/config";

export const announcementConfig: AnnouncementConfig = {
	// 公告标题
	title: "您所寻找的用户没有失联",

	// 公告内容
	content: "我还在慢慢完善网站呢，只是文章要等段时间更新了……",

	// 是否允许用户关闭公告
	closable: false,

	link: {
		// 启用链接
		enable: false,
		// 链接文本
		text: "了解更多",
		// 链接 URL
		url: "/about/",
		// 内部链接
		external: false,
	},
};
