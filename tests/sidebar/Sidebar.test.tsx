import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../../src/sidebar/Sidebar'

describe('Sidebar', () => {
  const onAnalyze = jest.fn().mockResolvedValue('ok')
  const defaultProps = {
    onClose: jest.fn(),
    onAnalyze,
  }

  it('renders Summary and Fact Check tabs', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText(/summary/i)).toBeInTheDocument()
    expect(screen.getByText(/fact check/i)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(<Sidebar {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('switches between tabs', () => {
    render(<Sidebar {...defaultProps} />)
    const factCheckTab = screen.getByRole('tab', { name: /fact check/i })
    fireEvent.click(factCheckTab)
    expect(factCheckTab).toHaveAttribute('aria-selected', 'true')
  })

  it('shows language toggle buttons', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByRole('button', { name: /中文/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /en/i })).toBeInTheDocument()
  })
})
