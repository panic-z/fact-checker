# Fact Checker

一个 Chrome 扩展，利用 AI 对 YouTube 和 Bilibili 视频进行总结与事实核查。

[English](README.md)

## 功能特性

- **视频总结** — 提取关键要点、内容概述和主要结论
- **事实核查** — 识别事实性错误、逻辑谬误、夸大表述和未经证实的说法
- **流式输出** — AI 处理字幕时实时流式返回结果
- **多 AI 提供商** — 支持 Claude（Anthropic）、OpenAI 或 OpenRouter
- **语言控制** — 输出语言可选中文、英文或自动跟随视频语言
- **Whisper 兜底** — 若视频无字幕，可选用 OpenAI Whisper 进行语音转写

## 支持的网站

- YouTube（`youtube.com/watch*`）
- Bilibili（`bilibili.com/video/*`）

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

在设置页中选择默认提供商、输出语言，以及（Claude / OpenAI）使用的模型。

## 使用方法

1. 打开 YouTube 或 Bilibili 视频页面
2. 点击工具栏中的扩展图标，打开分析面板
3. 切换到**视频总结**或**事实核查**标签页
4. 点击**开始分析**，等待结果流式输出
5. 点击**复制结果**按钮一键复制内容

## 开发

```bash
# 运行测试
npm test

# 监听模式
npm run dev
```

## 技术栈

- Chrome Extension Manifest V3
- React + TypeScript（侧边栏 UI）
- Claude API / OpenAI API / OpenRouter API（流式调用）
- Jest + ts-jest（单元测试）
