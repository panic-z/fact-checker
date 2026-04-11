# Fact Checker

A Chrome extension that summarizes and fact-checks YouTube and Bilibili videos using AI.

[中文文档](README.zh.md)

## Features

- **Summary** — extracts key points, a content overview, and main conclusions from any video
- **Fact Check** — identifies factual errors, logical fallacies, exaggerations, and unverified claims
- **Streaming results** — responses stream in real time as the AI processes the transcript
- **Multi-provider** — choose between Claude (Anthropic), OpenAI, or OpenRouter
- **Language control** — output in English, Chinese, or auto-match the video language
- **Whisper fallback** — if a video has no subtitles, optionally transcribe with OpenAI Whisper

## Supported Sites

- YouTube (`youtube.com/watch*`)
- Bilibili (`bilibili.com/video/*`)

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

Select your default provider, preferred output language, and (for Claude/OpenAI) model.

## Usage

1. Open a YouTube or Bilibili video
2. Click the extension icon in the toolbar to open the analysis panel
3. Choose the **Summary** or **Fact Check** tab
4. Click **Start Analysis** and wait for streaming results
5. Copy the result with the **Copy Result** button

## Development

```bash
# Run tests
npm test

# Watch mode
npm run dev
```

## Tech Stack

- Chrome Extension Manifest V3
- React + TypeScript (sidebar UI)
- Claude API / OpenAI API / OpenRouter API (streaming)
- Jest + ts-jest (unit tests)
