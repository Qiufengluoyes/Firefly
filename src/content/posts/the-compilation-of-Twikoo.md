---
title: 本人在编译 Twikoo 前端时遇到的问题及解决方案
published: 2025-10-03
description: '近几天本人在编译 Twikoo 的时候遇到了一些问题，这里特此发表出来向大家分享下'
image: ''
tags: [Twikoo, 编译]
category: '技术'
draft: false
lang: ''
pinned: false
---

:::note[协议声明]
本篇文章为**枫落丰源原创**，转载前请遵循 [**CC BY-NC-SA 4.0 协议**](https://creativecommons.org/licenses/by-nc-sa/4.0/) ，并声明本篇文章的标题及链接。
:::

## 为什么要自己编译 Twikoo？

在博客由 Typecho 迁移到基于 Astro 的静态博客后，我采用的评论系统便是由 iMaeGoo 开发的 Twikoo 评论系统。

::github{repo="twikoojs/twikoo"}

但是 Twikoo 在 Fuwari 这个基于 Astro 的主题上直接应用会有单击部分按钮直接返回网站顶部的问题。为了解决这一问题，于是我着手准备自己自行编译一个 Twikoo 前端。

但在编译过程中，我遇到了一堆奇怪的问题……

## 编译流程

### 编译环境的设置导致最终文件不同

Fork 项目后，我在 Vscode 上打开 Twikoo 的源码，准备快速搞完后干其他事。在一切准备工作搞完后，我尝试进行 Twikoo 前端的编译，这便引出了编译 Twikoo 前端出现的第一个问题。

编译完之后的我查看 `dist` 文件夹，发现编译后生成的文件如下：

```flies
<!-- twikoo/dist -->
…… // 其他文件
twikoo.nocss.js
twikoo.nocss.js.LICENSE.txt
```

诶，为什么 `pnpm build` 之后没有生成 Twikoo 文档里所说的 `twikoo.all.min.js` 和 `twikoo.min.js` 呢？抱着疑问，我去询问了 Mugzx 大佬，得到了如下答复：

> Mugzx：关于编译可以看看package.json里是怎么写的[菜汪]

于是我打开了 `package.json` 文件准备对其进行修改。

```json
<!-- twikoo/package.json -->
"scripts": {
    "dev": "webpack serve --mode development",
    "serve": "webpack serve --mode development",
    "build": "cross-env NODE_ENV=production webpack --mode production",
    "analyze": "webpack --profile --json > stats.json && webpack-bundle-analyzer stats.json",
    "login": "tcb login",
    "logout": "tcb logout",
    "deploy": "tcb fn deploy twikoo --force",
    "lint": "eslint src/** --ignore-path .eslintignore",
    "docs:dev": "cd docs && yarn docs:dev",
    "docs:build": "cd docs && yarn docs:build"
```

其中我注意到了 `"build": "cross-env NODE_ENV=production webpack --mode production",t",` 这一代码，因为本人之前从未研究过 `package.json` 文件的组成，并且 npm 和 pnpm 所以我将这一问题抛给了 AI 解答。

<details>

<summary>AI 回答（点击展开）</summary>

> 这条命令是一个典型的用于构建生产环境前端资源的 npm script，常见于 `package.json` 文件的 `scripts` 部分。
>
> 让我们分解一下它的各个部分：
>
> 1. **`"build":`**: 这定义了一个名为 `build` 的脚本。你可以通过在终端运行 `npm run build` 或 `yarn build` 来执行它。
> 2. **`cross-env NODE_ENV=production`**:
>
>    * `cross-env`: 这是一个跨平台的工具，用于设置环境变量。它确保了 `NODE_ENV=production` 这个设置在 Windows、macOS 和 Linux 等不同操作系统上都能正常工作。如果没有 `cross-env`，在 Windows 上直接设置环境变量的语法会不同（例如 `set NODE_ENV=production && webpack...`），这会导致脚本在不同平台上不可移植。
>    * `NODE_ENV=production`: 这将 Node.js 环境变量 `NODE_ENV` 设置为 `"production"`。这个变量非常重要，因为它会通知 Webpack、Babel 以及其他可能依赖此变量的库（如 React）当前处于生产环境。这通常会触发一系列优化，例如：
>      * 移除开发时的调试信息和警告。
>      * 启用代码压缩和混淆（如 TerserPlugin）。
>      * 可能禁用某些仅用于开发的功能（如 React 的 PropTypes 检查在生产模式下会被剥离）。
> 3. **`webpack --mode production`**:
>
>    * `webpack`: 调用 Webpack 模块打包工具。
>    * `--mode production`: 明确告诉 Webpack 使用生产模式进行构建。Webpack 的 `production` 模式会自动应用一系列内置优化，包括：
>      * 启用 `FlagDependencyUsagePlugin` (标记未使用的导出)。
>      * 启用 `FlagIncludedChunksPlugin` (标记包含的 chunk)。
>      * 启用 `ModuleConcatenationPlugin` (作用域提升/Scope Hoisting)。
>      * 启用 `NoEmitOnErrorsPlugin` (编译出错时跳过输出)。
>      * 启用 `TerserPlugin` (压缩 JS 代码)。
>      * 将 `process.env.NODE_ENV` 的值在代码中替换为 `"production"` (这与 `cross-env` 设置的环境变量相辅相成，确保打包后的代码内部也知道是生产环境)。
>      * 启用 `sideEffects: false` 的 tree shaking (如果在 `package.json` 中配置了)。
>
> **总结:**
>
> 这条 `build` 命令的作用是：
>
> * **跨平台地**设置环境变量 `NODE_ENV` 为 `"production"`。
> * 调用 Webpack，并**明确指定以生产模式**进行打包。
> * 最终生成**经过高度优化、压缩、适合部署到线上服务器**的静态资源文件（通常是 `dist` 或 `build` 目录下的 `.js`, `.css`, `.html` 等文件）。
>
> 这是前端项目准备上线前的标准操作。

</details>

我意识到，这玩意如果要让他正常生成 `twikoo.all.min.js` 和 `twikoo.min.js` 的话，需要在 `package.json` 中把原来的**生产环境**改为**开发环境**，代码改动点如下方所示：

```diff
<!-- twikoo/package.json -->
-    "build": "cross-env NODE_ENV=production webpack --mode production",
+    "build": "cross-env NODE_ENV=development webpack --mode development",
```

再次运行 `pnpm build` ，此时 `twikoo.all.min.js` 和 `twikoo.min.js`  已正常生成在 `dist` 文件夹中。

```flies
<!-- twikoo/dist -->
…… // 其他文件
twikoo.all.min.js
twikoo.all.min.js.LICENSE.txt
twikoo.min.js
twikoo.min.js.LICENSE.txt
```

### 发现 `twikoo.min.js` 不能正常使用

众所周知，Twikoo 一共提供了三种不同版本的 JS 文件（以下摘自 [Twikoo 文档](https://twikoo.js.org/) ）：

> * `twikoo.all.min.js`: 包含腾讯云云开发（tcb）的完整版本，如果您使用腾讯云云开发部署，请选择此版本
> * `twikoo.min.js`: 去除了腾讯云云开发（tcb）的精简版本，体积更小，适合所有非腾讯云云开发部署的用户
> * `twikoo.nocss.js`: 在完整版本的基础上剥离了样式，需要同时引入 `twikoo.css` 才能正常显示，适合想要魔改评论区样式的用户

本人的博客在 Vercel 部署，自然就不必使用 `twikoo.all.min.js` 这一完整版本给自己的网站徒增流量消耗，于是我将 `dist` 生成的 `twikoo.min.js` 文件放入 CDN 中，结果评论系统直接原地「蒸发」了：怎么网站上的评论区域没有显示出评论区啊？

经过一段时间的排查，自己没有找出来原因具体在哪里，最终还是由 Mugzx 给予了我解决方案。

![Mugzx 截图](https://image.091026.xyz/the-compilation-of-Twikoo-1.webp "Mugzx 截图")

> 你那边把路径修改成这样，然后尝试本地 `pnpm build` ，没问题后再尝试推送到远程，验证开发/生产环境的行为是否不一致

果然，在修改了这一行代码后，生成出来的 `twikoo.min.js` 可以正常使用，不过本人生成出来的文件大小仍然要比 Mugzx 生成出来的大，看来以后还是得找时间研究下该怎样把文件体积优化缩小。

## 总结

Twikoo 的部署对于我这种小白来说确实有点迷，不过也算是学到了个新的技能吧。
