import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App navigation and progressive disclosure', () => {
  it('starts on home with explicit view buttons', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /checkout-api/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Requests' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Instances' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logs' })).toBeInTheDocument()
  })

  it('navigates to requests and exposes time ranges', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Requests' })[0])
    expect(screen.getByRole('heading', { name: 'Requests' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1h' })).toHaveClass('active')
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument()
  })

  it('filters logs to surface pool exhaustion aggregates', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Logs' })[0])
    await user.click(screen.getByRole('button', { name: 'error' }))
    expect(screen.getAllByText(/connection pool exhausted/i).length).toBeGreaterThan(0)
  })
})
