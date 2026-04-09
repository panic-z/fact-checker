// tests/options/Options.test.tsx
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Options } from '../../src/options/Options'

beforeEach(() => {
  ;(chrome.storage.local.get as jest.Mock).mockResolvedValue({})
})

describe('Options', () => {
  it('renders all settings fields', async () => {
    render(<Options />)
    await waitFor(() => {
      expect(screen.getByLabelText(/claude api key/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/openai api key/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('saves settings when save button is clicked', async () => {
    render(<Options />)
    await waitFor(() => screen.getByLabelText(/claude api key/i))

    fireEvent.change(screen.getByLabelText(/claude api key/i), {
      target: { value: 'sk-ant-new' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument()
    })
  })
})
