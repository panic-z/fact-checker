import { test, expect, toggleSidebar } from './fixtures'

test.describe('Sidebar UI', () => {
  test('opens on a YouTube video page', async ({ youtubeVideoPage, serviceWorker }) => {
    const page = await youtubeVideoPage()

    await toggleSidebar(serviceWorker, 'youtube.com')

    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.fc-title')).toHaveText('FactChecker')
  })

  test('closes when the × button is clicked', async ({ youtubeVideoPage, serviceWorker }) => {
    const page = await youtubeVideoPage()
    await toggleSidebar(serviceWorker, 'youtube.com')

    const sidebar = page.locator('#fact-checker-sidebar-root')
    await expect(sidebar).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'Close' }).click()

    // Container is hidden (display:none), not removed from DOM
    await expect(page.locator('#fact-checker-root')).toHaveCSS('display', 'none')
  })

  test('re-opens after close when toggled again', async ({ youtubeVideoPage, serviceWorker }) => {
    const page = await youtubeVideoPage()

    await toggleSidebar(serviceWorker, 'youtube.com')
    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator('#fact-checker-root')).toHaveCSS('display', 'none')

    await toggleSidebar(serviceWorker, 'youtube.com')
    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })
  })

  test('shows Summary and Fact Check tabs', async ({ youtubeVideoPage, serviceWorker }) => {
    const page = await youtubeVideoPage()
    await toggleSidebar(serviceWorker, 'youtube.com')
    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })

    const tabs = page.getByRole('tab')
    await expect(tabs).toHaveCount(2)
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')  // Summary active by default
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false')
  })

  test('switches to Fact Check tab', async ({ youtubeVideoPage, serviceWorker }) => {
    const page = await youtubeVideoPage()
    await toggleSidebar(serviceWorker, 'youtube.com')
    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })

    const factCheckTab = page.getByRole('tab').nth(1)
    await factCheckTab.click()

    await expect(factCheckTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab').nth(0)).toHaveAttribute('aria-selected', 'false')
  })

  test('language toggle buttons are present', async ({ youtubeVideoPage, serviceWorker }) => {
    const page = await youtubeVideoPage()
    await toggleSidebar(serviceWorker, 'youtube.com')
    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })

    await expect(page.getByRole('button', { name: '中文' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'EN' })).toBeVisible()
  })

  test('EN language button becomes active when clicked', async ({ youtubeVideoPage, serviceWorker }) => {
    const page = await youtubeVideoPage()
    await toggleSidebar(serviceWorker, 'youtube.com')
    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })

    const enBtn = page.getByRole('button', { name: 'EN' })
    await enBtn.click()

    await expect(enBtn).toHaveClass(/active/)
    await expect(page.getByRole('button', { name: '中文' })).not.toHaveClass(/active/)
  })

  test('settings button is visible', async ({ youtubeVideoPage, serviceWorker }) => {
    const page = await youtubeVideoPage()
    await toggleSidebar(serviceWorker, 'youtube.com')
    await expect(page.locator('#fact-checker-sidebar-root')).toBeVisible({ timeout: 5000 })

    await expect(page.locator('.fc-settings-btn')).toBeVisible()
  })
})
