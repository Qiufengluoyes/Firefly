import type { FriendLink, FriendsPageConfig } from "../types/config";

// 可以在src/content/spec/friends.md中编写友链页面下方的自定义内容

// 友链页面配置
export const friendsPageConfig: FriendsPageConfig = {
	// 显示列数：2列或3列
	columns: 2,
};

// 友链配置
export const friendsConfig: FriendLink[] = [
    {
    title: "枫落丰源 Center",
    imgurl: "https://image.091026.xyz/blog/icons/iz_by_hyper_os.webp",
    desc: "个人主页 & 说说",
    siteurl: "https://www.feng1026.top/",
    tags: ["枫落丰源"],
    weight: 8,
    enabled: true,
  },
  {
    title: "RefactX Project",
    imgurl: "https://www.refact.cc/avatar.png",
    desc: "形体是简单而纯粹的，它不是完整的群体，每个形体都指向其复杂性，并最终被复杂性联系在一起。",
    siteurl: "https://www.refact.cc/",
    tags: ["Refactored"],
    weight: 8,
    enabled: true,
  },
  {
    title: "Mugzx's Blog",
    imgurl: "https://www.mugzx.top/api/avatar.png",
    desc: "向上革命，向下实践。",
    siteurl: "https://blog.mugzx.top/",
    tags: ["Mugzx"],
    weight: 8,
    enabled: true,
  },
  {
    title: "MoXiify's Blog",
    imgurl: "https://note.moxiify.cn/usr/uploads/2025/07/3192505840.webp",
    desc: "做一条，逆流的鱼。",
    siteurl: "https://note.moxiify.cn/",
    tags: ["墨希MoXiify"],
    weight: 8,
    enabled: true,
  },
  {
    title: "LineXic 书屋",
    imgurl: "https://github.com/LineXic.png",
    desc: "难离难舍，想抱紧些",
    siteurl: "https://www.linexic.top/",
    tags: ["LineXic"],
    weight: 8,
    enabled: true,
  },
  {
    title: "张恒华",
    imgurl: "https://zhh2001.github.io/avatar.jpg",
    desc: "SDN 研究者",
    siteurl: "https://zhh2001.github.io/",
    tags: ["张恒华"],
    weight: 8,
    enabled: true,
  },
  {
    title: "LYEy_isine",
    imgurl: "https://tc-new.z.wiki/autoupload/f/UdxyOKhNTtcbZB7VCT3UgfISxQjrFcHo0MYIVlLsrJSyl5f0KlZfm6UsKj-HyTuv/20250906/NGik/460X460/103258286.png",
    desc: "花海无一日，少年踏自来",
    siteurl: "https://caiyifeng.top/",
    tags: ["LYEy_isine"],
    weight: 8,
    enabled: true,
  },
  {
    title: "Astro",
    imgurl: "https://avatars.githubusercontent.com/u/44914786?v=4&s=640",
    desc: "The web framework for content-driven websites. ⭐️ Star to support our work!",
    siteurl: "https://github.com/withastro/astro",
    tags: ["Framework"],
    weight: 8,
    enabled: true,
  },
];

// 获取启用的友链并按权重排序
export const getEnabledFriends = (): FriendLink[] => {
	return friendsConfig
		.filter((friend) => friend.enabled)
		.sort((a, b) => b.weight - a.weight);
};
