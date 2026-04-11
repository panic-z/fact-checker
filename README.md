# Fact Checker

A Chrome extension that summarizes and fact-checks Bilibili videos with AI.

[中文文档](README.zh.md)

## Features

- **Video summary** — extracts key points, a concise overview, and main takeaways
- **Fact check** — flags likely factual errors, logical fallacies, exaggerations, and unsupported claims
- **Streaming output** — renders the model response progressively as it arrives
- **Multi-provider AI** — supports Claude, OpenAI, and OpenRouter
- **Language selection** — output in Chinese, English, or follow the video language
- **In-page sidebar** — opens analysis directly on the Bilibili video page
- **Local settings storage** — API keys are stored in extension storage with AES-GCM encryption before persistence

## Current Support

- Bilibili (`bilibili.com/video/*`)

YouTube is not currently wired up in the shipped manifest/content script flow. The extension currently runs on Bilibili video pages only.

## How It Works

1. Open a Bilibili video page.
2. Click the extension icon to open the popup.
3. Click **Open Panel** to inject the sidebar into the page.
4. Pick **Summary** or **Fact Check**.
5. Click **Start Analysis**.
6. The extension fetches the video transcript, sends the prompt to your selected AI provider, and streams the result into the sidebar.

If a video has no subtitles, the current build shows an error instead of falling back to speech-to-text transcription.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Build the extension

```bash
npm run build
```

### 3. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the project root

### 4. Configure API keys

Click the extension icon → **Settings**, then enter your API key(s):

| Provider | Where to get a key |
|---|---|
| Claude | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) |

Then choose:

- your default provider
- your preferred output language
- the model for Claude/OpenAI
- the model slug for OpenRouter

Current defaults in code:

- Claude: `claude-sonnet-4-6`
- OpenAI: `gpt-4o`
- OpenRouter: `openai/gpt-4o`

## Usage

1. Open a Bilibili video page
2. Click the extension icon
3. Click **Open Panel**
4. Choose **Summary** or **Fact Check**
5. Click **Start Analysis** and wait for the streamed result
6. Copy the output with **Copy Result**

## Development

```bash
# Watch mode
npm run dev

# Production build
npm run build

# Unit tests
npm test
```

The project is built with Vite and CRXJS. `npm run dev` rebuilds the extension in watch mode for reloading in Chrome.

## Tech Stack

- Chrome Extension Manifest V3
- React + TypeScript
- Vite + `@crxjs/vite-plugin`
- Claude API / OpenAI API / OpenRouter API
- Bilibili transcript fetching + session transcript cache
- Jest + ts-jest (unit tests)
