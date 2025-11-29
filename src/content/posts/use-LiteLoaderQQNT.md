---
title: LiteLoaderQQNT 插件的个人使用及心得
published: 2025-09-07
description: '在暑假，我偶然了解到了 LiteLoaderQQNT 这样一个 QQ 外置插件，该插件具有强大的功能拓展，大大提高了 NTQQ 的可玩性。经过本人一个月的使用，特此在博客发表简短的个人心得'
image: 'https://image.091026.xyz/Use-LiteLoaderQQNT-0.webp'
tags: [QQ, LiteLoaderQQNT]
category: '技术'
draft: false 
lang: ''
---
:::note[协议声明]
本篇文章为**枫落丰源原创**，转载前请遵循 [**CC BY-NC-SA 4.0 协议**](https://creativecommons.org/licenses/by-nc-sa/4.0/) ，并声明本篇文章的标题及链接。
:::

:::warning[警告]
本篇文章中包含腾讯官方不受支持、甚至反对的外置插件，多次被腾讯检测可能会导致**被踢下线**、**封禁账号**等一系列惩罚措施，请结合个人自身实际情况谨慎使用该类外置插件。
:::

## 为什么要使用 LiteLoaderQQNT？

自己本来想给 PC 上的 QQ 自定义背景，但是就改个背景这么简单的功能也要用 SVIP 圈你钱，~~腾讯你抢钱抢疯了~~。

于是自己动手丰衣足食，在网络上查找教程，了解并下载安装了 LiteLoaderQQNT 来缓解我修改背景的燃眉之急。

![](https://image.091026.xyz/Use-LiteLoaderQQNT-1.webp "QQNT 主题更改界面")

## LiteLoaderQQNT 的安装

在 LiteLoaderQQNT 的安装上，本人使用的是本项目文档里推荐的社区安装脚本，全程傻瓜式操作，在网络环境良好下 15s 内即可安装完毕。

::github{repo="Mzdyl/LiteLoaderQQNT_Install"}

> 使用 Python 编写的安装脚本，支持 Windows / Linux / MacOS。

（中途还因为程序的文件目录与数据目录数据错误导致安装失败，插件没有生效，建议按照安装脚本推荐的目录安装）

安装完成后，为了绕开 Windows 上 NTQQ 恶心人的安全监测，我们还需下载 `dbghelp.dll` 才可正常使用（获取及使用方式见 Github 项目详情）。

::github{repo="LiteLoaderQQNT/LiteLoaderQQNT"}

## 使用感受

本人一共安装了 5 款插件：

![](https://image.091026.xyz/Use-LiteLoaderQQNT-2.webp "插件列表")

主要就是换个背景简单美化下 QQ + 防撤回 + 禁用 NTQQ 的更新（防止 NTQQ 的自动更新把我插件干废）。

除了我所使用的插件之外，插件商店里还有更多的插件任你使用，包括 NTQQ 的整体美化、提升 NTQQ 的整体使用体验。

当然，使用这种插件的缺点肯定是有的。

## 使用 LiteLoaderQQNT 所带来的风险

自 2025 年初开始，官方加强了对 Android 端和 Windows 端 NTQQ 的检测，若检测到用户有任何使用外置插件的行为将会直接被踢下线，甚至限制社交功能和封号。

![](https://image.091026.xyz/Use-LiteLoaderQQNT-3.webp "被踢下线通知")

所以如要使用此类外置插件，建议不要在自己存有大量重要数据的账号上使用。

## 总结

虽然说 LiteLoaderQQNT 与其他外置插件一样不被腾讯所提倡、支持，不过里面的插件的确实打实的好用，另外安装这玩意也可以顺便提升你的技术力（如果能不使用社区安装脚本安装那就更好了）。
