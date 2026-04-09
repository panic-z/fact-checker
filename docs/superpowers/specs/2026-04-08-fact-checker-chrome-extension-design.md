# Fact Checker Chrome Extension — Design Spec

**Date:** 2026-04-08  
**Status:** Approved

---

## Overview

A Chrome browser extension that summarizes YouTube and Bilibili videos and checks them for factual and logical errors. Supports Chinese and English, uses the user's own Claude or OpenAI API key, and runs entirely in the browser with no backend server.

---

## Architecture

### Approach: Pure Frontend Chrome Extension (Manifest V3)

All logic runs inside the browser extension. The extension fetches subtitles/transcripts directly from platform APIs, calls Claude or OpenAI APIs using the user's stored key, and renders results in a page-embedded sidebar.

**Tech stack:** TypeScript, React, Chrome Extension Manifest V3

### File Structure

```
fact-checker/
├── manifest.json
├── src/
│   ├── background/        # Service Worker: coordinates messages, manages API key access
│   ├── content/           # Content Script: injected into video pages, fetches subtitles, renders sidebar
│   ├── popup/             # Toolbar popup: settings entry + quick open panel button
│   ├── sidebar/           # Sidebar UI: analysis results display
│   ├── options/           # Options/settings page
│   ├── services/
│   │   ├── transcript/    # Subtitle fetching (YouTube + Bilibili)
│   │   ├── ai/            # Claude / OpenAI API calls
│   │   └── whisper/       # Audio-to-text fallback
│   └── shared/            # Type definitions, i18n strings, utility functions
└── public/                # Icons, static assets
```

### Data Flow

1. Content Script detects current page is a YouTube or Bilibili video page
2. User clicks "Analyze" → Content Script fetches subtitles → sends message to Background Service Worker
3. Background Worker calls AI API (using stored key) → streams response back
4. Content Script receives streamed result → renders into sidebar

### Required Permissions

- `storage` — store API keys and user preferences
- `tabs` — detect current URL to identify video pages
- `host_permissions` for `youtube.com`, `googlevideo.com`, `bilibili.com`, `api.anthropic.com`, `api.openai.com`

---

## Subtitle / Transcript Fetching

### YouTube

- Parse `ytInitialPlayerResponse` from the page to extract `captionTracks`
- Fetch subtitles directly from the official `timedtext` URL
- Support both auto-generated captions and manually uploaded captions
- Language priority: user's configured language → video's original language → English

### Bilibili

- Parse video `cid` from page's `__INITIAL_STATE__` or URL parameters
- Call Bilibili subtitle API: `/api/subtitle` to retrieve CC subtitles
- Many Bilibili videos have no subtitles → fall back to Whisper prompt

### Whisper Fallback (both platforms)

- When no subtitle is available, show prompt: "This video has no subtitles. Use Whisper speech recognition? (This will consume your OpenAI API quota.)"
- On user confirmation: fetch audio stream → send to OpenAI Whisper API directly from the browser
- Whisper result is cached in `chrome.storage.session` by video ID to avoid re-processing

### Caching

- Fetched subtitles cached in `chrome.storage.session` keyed by video ID
- Cache clears on page reload or browser session end

---

## AI Analysis

### Supported Models

| Provider  | Default Model       | User-configurable |
|-----------|---------------------|-------------------|
| Claude    | `claude-sonnet-4-6` | Yes               |
| OpenAI    | `gpt-4o`            | Yes               |

### Feature: Video Summary

Prompt template:
```
Analyze the following video transcript and respond in {language}:
1. Key points (3–5 bullet points)
2. Content overview (under 150 words)
3. Main conclusions
```

### Feature: Fact & Logic Check

Prompt template:
```
Analyze the following video transcript for factual errors and logical fallacies. Respond in {language}.
For each issue found:
- Quote the relevant passage
- Label the issue type (factual error / logical fallacy / exaggeration / etc.)
- Briefly explain the problem
If no significant issues are found, state: "No significant issues detected."
```

### Streaming Output

- Use SSE (Server-Sent Events) to stream AI responses
- Results render progressively in the sidebar as they arrive

### Long Transcript Handling

- If transcript exceeds model context limit (~100k tokens), split into segments
- Analyze each segment independently, then merge results into a coherent output

### Error Handling

All errors display user-friendly messages in the current UI language:
- Invalid API key
- Insufficient balance / quota exceeded
- Network timeout
- Platform rate limiting

---

## UI & Interaction

### Toolbar Popup

- If current page is a YouTube or Bilibili video: show "Open Analysis Panel" button
- If not a video page: show "Please navigate to a YouTube or Bilibili video"
- Link to Settings/Options page

### Page-Embedded Sidebar

- Slides in from the right side of the page; width ~380px
- Positioned to avoid overlapping the video player
- **Header:** language toggle (中文 / EN), close button
- **Two tabs:** "Summary" and "Fact Check"
- Each tab: "Start Analysis" button → loading animation → streamed result display
- Results include a "Copy to clipboard" button

### Options / Settings Page

- Claude API Key input + model selector (`claude-sonnet-4-6`, etc.)
- OpenAI API Key input + model selector (`gpt-4o`, etc.)
- Default AI provider selection (Claude / OpenAI)
- Default language setting: Chinese / English / Follow video language
- Save confirmation feedback

### Security

- API keys stored encrypted in `chrome.storage.local` using AES encryption
- Encryption key derived from the extension's ID (never hardcoded)
- API keys are never logged to console or included in error reports

---

## Internationalization (i18n)

- All UI strings maintained in `src/shared/i18n/` with `zh.ts` and `en.ts` files
- Language toggle in sidebar header changes the UI language immediately
- AI output language is controlled separately by the language setting passed in the prompt
- Default language fallback: Chinese

---

## Testing Strategy

- Unit tests for subtitle parsing logic (YouTube + Bilibili)
- Unit tests for prompt construction and response parsing
- Unit tests for API key encryption/decryption
- Integration tests mocking Chrome extension APIs (`chrome.storage`, `chrome.tabs`)
- Manual end-to-end testing on sample YouTube and Bilibili videos

---

## Out of Scope

- Backend server or cloud infrastructure
- Support for platforms other than YouTube and Bilibili
- Video downloading or offline storage
- User accounts or cross-device sync
