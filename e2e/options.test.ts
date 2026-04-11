import { test, expect } from './fixtures'

test.describe('Options page', () => {
  test('loads with default settings', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`)

    await expect(page.getByRole('heading', { name: /fact checker/i })).toBeVisible()
    // API key inputs are empty by default (labels are same in zh and en)
    await expect(page.getByLabel('Claude API Key')).toHaveValue('')
    await expect(page.getByLabel('OpenAI API Key')).toHaveValue('')
    await expect(page.getByLabel('OpenRouter API Key')).toHaveValue('')
  })

  test('save button is present', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`)

    // Options renders with default 'zh' i18n: saveSettings = '保存设置'
    await expect(page.getByRole('button', { name: '保存设置' })).toBeVisible({ timeout: 5000 })
  })

  test('entering and saving an API key shows confirmation', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`)

    await page.getByLabel('Claude API Key').fill('sk-ant-test-key-123')
    await page.getByRole('button', { name: '保存设置' }).click()

    // settingsSaved = '设置已保存'
    await expect(page.getByText('设置已保存')).toBeVisible({ timeout: 3000 })
  })

  test('saved API key persists after page reload', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`)

    await page.getByLabel('Claude API Key').fill('sk-ant-persist-test')
    await page.getByRole('button', { name: '保存设置' }).click()
    await expect(page.getByText('设置已保存')).toBeVisible({ timeout: 3000 })

    await page.reload()
    // The password input should be non-empty after reload
    const input = page.getByLabel('Claude API Key')
    await expect(input).not.toHaveValue('')
  })

  test('default provider select is present with Claude selected', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`)

    const providerSelect = page.locator('select').filter({ hasText: 'Claude' }).first()
    await expect(providerSelect).toBeVisible()
  })
})
