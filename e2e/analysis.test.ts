import { test, expect, toggleSidebar, buildClaudeStreamBody } from './fixtures'

// The analysis flow: content script fetches transcript → sends ANALYZE to background
// → background calls Claude API → sends ANALYSIS_CHUNK messages back → sidebar renders chunks.
// We mock the Claude API at context level so service worker fetch calls are intercepted.

test.describe('Summary analysis', () => {
  test('streams result into the Summary tab', async ({ context, youtubeVideoPage, serviceWorker }) => {
    // Mock Claude streaming API (intercepted at context level to cover service worker)
    await context.route('https://api.anthropic.com/v1/messages', route =>
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        body: buildClaudeStreamBody(['This video ', 'discusses flat ', 'earth claims.']),
      })
    )

    const page = await youtubeVideoPage()
    await toggleSidebar(serviceWorker, 'youtube.com')
    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: '开始分析' }).click()

    await expect(page.locator('.fc-result')).toContainText('This video discusses flat earth claims.', { timeout: 15000 })
    await expect(page.locator('.fc-copy-btn')).toBeVisible()
  })

  test('copy button shows "Copied" feedback after click', async ({ context, youtubeVideoPage, serviceWorker }) => {
    await context.route('https://api.anthropic.com/v1/messages', route =>
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: buildClaudeStreamBody(['Copy test content']),
      })
    )

    const page = await youtubeVideoPage()
    await toggleSidebar(serviceWorker, 'youtube.com')
    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: '开始分析' }).click()
    await expect(page.locator('.fc-result')).toBeVisible({ timeout: 15000 })

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://www.youtube.com' })
    await page.locator('.fc-copy-btn').click()
    await expect(page.locator('.fc-copy-btn')).toContainText('已复制')
  })

  test('shows error when API returns 401', async ({ context, youtubeVideoPage, serviceWorker }) => {
    await context.route('https://api.anthropic.com/v1/messages', route =>
      route.fulfill({ status: 401, body: '{"error":"invalid key"}' })
    )

    const page = await youtubeVideoPage()
    await toggleSidebar(serviceWorker, 'youtube.com')
    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: '开始分析' }).click()

    await expect(page.locator('.fc-error')).toBeVisible({ timeout: 15000 })
  })

  test('shows Whisper prompt when video has no subtitles', async ({ context, youtubeVideoPage, serviceWorker }) => {
    const page = await youtubeVideoPage('nosubs')

    // Override the timedtext route to return an empty transcript
    await page.route('**/timedtext**', route =>
      route.fulfill({ contentType: 'text/xml', body: '<transcript></transcript>' })
    )

    // Also override the YouTube page to have no caption tracks
    await page.route('https://www.youtube.com/watch?v=nosubs', route =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><body>
<script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[]}}};</script>
</body></html>`,
      })
    )

    await page.goto('https://www.youtube.com/watch?v=nosubs')
    await toggleSidebar(serviceWorker, 'youtube.com')
    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: '开始分析' }).click()

    await expect(page.locator('.fc-whisper-prompt')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Fact Check analysis', () => {
  test('streams result in the Fact Check tab', async ({ context, youtubeVideoPage, serviceWorker }) => {
    await context.route('https://api.anthropic.com/v1/messages', route =>
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: buildClaudeStreamBody(['Claim 1: False. ', 'Claim 2: Unverified.']),
      })
    )

    const page = await youtubeVideoPage()
    await toggleSidebar(serviceWorker, 'youtube.com')
    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })

    // Switch to Fact Check tab
    await page.getByRole('tab').nth(1).click()
    await page.getByRole('button', { name: '开始分析' }).click()

    await expect(page.locator('.fc-result')).toContainText('Claim 1: False.', { timeout: 15000 })
  })
})
