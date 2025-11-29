import type { ProfileConfig } from "../types/config";

export const profileConfig: ProfileConfig = {
  avatar: "/assets/images/avatar.jpg",
  name: "枫落丰源",
  bio: "和你的日常，就是奇迹",
  links: [
    {
			name: "哔哩哔哩",
			icon: "mingcute:bilibili-line", // Visit https://icones.js.org/ for icon codes
			// You will need to install the corresponding icon set if it's not already included
			// `pnpm add @iconify-json/<icon-set-name>`
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
