# Fact Checker

一个 Chrome 扩展，利用 AI 对 Bilibili 视频进行总结与事实核查。

[English](README.md)

## 功能特性

- **视频总结** — 提取关键要点、简明概述和主要结论
- **事实核查** — 标记可能存在的事实错误、逻辑谬误、夸大表述和缺乏依据的说法
- **流式输出** — 模型返回内容会逐步渲染到界面中
- **多 AI 提供商** — 支持 Claude、OpenAI 和 OpenRouter
- **语言选择** — 输出可选中文、英文，或跟随视频语言
- **页内侧边栏** — 直接在 Bilibili 视频页内打开分析面板
- **本地设置存储** — API Key 在持久化前会通过 AES-GCM 加密后存入扩展存储

## 当前支持

- Bilibili（`bilibili.com/video/*`）

当前发布代码里的 manifest 和 content script 只接入了 Bilibili，YouTube 还没有真正接通。

## 工作流程

1. 打开一个 Bilibili 视频页面
2. 点击浏览器工具栏里的扩展图标，打开弹窗
3. 点击 **Open Panel**，将侧边栏注入当前页面
4. 选择 **Summary** 或 **Fact Check**
5. 点击 **Start Analysis**
6. 扩展会先抓取视频字幕，再把提示词发送给你选择的 AI 提供商，并将结果流式展示在侧边栏中

如果视频没有字幕，当前版本会直接提示错误，还没有接入语音转写兜底流程。

## 安装与配置

### 1. 安装依赖

```bash
npm install
```

### 2. 构建扩展

```bash
npm run build
```

### 3. 加载到 Chrome

1. 打开 `chrome://extensions`
2. 开启右上角的**开发者模式**
3. 点击**加载已解压的扩展程序**，选择项目根目录

### 4. 配置 API Key

点击工具栏中的扩展图标 → **设置**，填入对应的 API Key：

| 提供商 | 获取地址 |
|---|---|
| Claude | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) |

然后设置：

- 默认提供商
- 默认输出语言
- Claude / OpenAI 使用的模型
- OpenRouter 使用的模型标识

当前代码中的默认值：

- Claude：`claude-sonnet-4-6`
- OpenAI：`gpt-4o`
- OpenRouter：`openai/gpt-4o`

## 使用方法

1. 打开一个 Bilibili 视频页面
2. 点击扩展图标
3. 点击 **Open Panel**
4. 选择 **Summary** 或 **Fact Check**
5. 点击 **Start Analysis**，等待结果流式输出
6. 点击 **Copy Result** 复制结果

## 开发

```bash
# 监听模式
npm run dev

# 生产构建
npm run build

# 单元测试
npm test
```

项目使用 Vite 和 CRXJS 构建。`npm run dev` 会以 watch 模式持续构建，方便你在 Chrome 中重新加载扩展调试。

## 技术栈

- Chrome Extension Manifest V3
- React + TypeScript
- Vite + `@crxjs/vite-plugin`
- Claude API / OpenAI API / OpenRouter API
- Bilibili 字幕抓取 + session 级字幕缓存
- Jest + ts-jest（单元测试）
