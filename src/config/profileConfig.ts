import type { ProfileConfig } from "../types/config";

export const profileConfig: ProfileConfig = {
	// 头像
	avatar: "/assets/images/avatar.jpg",

	// 名字
	name: "枫落丰源",

	// 个人签名
	bio: "和你的日常，就是奇迹",

	// 链接配置
	// 已经预装的图标集：fa6-brands，fa6-regular，fa6-solid，material-symbols，simple-icons
	// 访问https://icones.js.org/ 获取图标代码，
	// 如果想使用尚未包含相应的图标集，则需要安装它
	// `pnpm add @iconify-json/<icon-set-name>`
	// showName: true 时显示图标和名称，false 时只显示图标
  links: [
    {
			name: "哔哩哔哩",
			icon: "mingcute:bilibili-line",
			url: "https://space.bilibili.com/1735270180/",
		},
		{
			name: "GitHub",
			icon: "tabler:brand-github",
			url: "https://github.com/Qiufengluoyes",
		},
		{
			name: "电子邮箱",
			icon: "ic:round-mail-outline",
			url: "mailto:qiufengluoyes@outlook.com",
		},
		{
			name: "Steam",
			icon: "mdi:steam",
			url: "https://steamcommunity.com/id/qiufengluoye44/",
		},
  ],
};
