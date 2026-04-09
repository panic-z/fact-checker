import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Popup } from '../../src/popup/Popup'

beforeEach(() => {
  ;(chrome.tabs.query as jest.Mock).mockResolvedValue([{ id: 1, url: 'https://www.youtube.com/watch?v=abc' }])
  ;(chrome.tabs.sendMessage as jest.Mock).mockResolvedValue({})
})

describe('Popup', () => {
  it('shows open panel button on video pages', async () => {
    render(<Popup />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open analysis panel/i })).toBeInTheDocument()
    })
  })

  it('sends TOGGLE_SIDEBAR message when open panel is clicked', async () => {
    render(<Popup />)
    await waitFor(() => screen.getByRole('button', { name: /open analysis panel/i }))
    fireEvent.click(screen.getByRole('button', { name: /open analysis panel/i }))
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { type: 'TOGGLE_SIDEBAR' })
  })

  it('shows non-video-page message on non-video pages', async () => {
    ;(chrome.tabs.query as jest.Mock).mockResolvedValue([{ id: 2, url: 'https://google.com' }])
    render(<Popup />)
    await waitFor(() => {
      expect(screen.getByText(/youtube or bilibili/i)).toBeInTheDocument()
    })
  })
})
