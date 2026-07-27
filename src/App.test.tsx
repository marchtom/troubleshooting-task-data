import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

function goto(hash: string) {
  act(() => {
    window.location.hash = hash
    window.dispatchEvent(new Event('hashchange'))
  })
}

describe('App navigation, gating and progressive disclosure', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.location.hash = ''
  })

  it('starts on home with no metric tabs revealed', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /sharing-service/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Service Health' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Logs' })).toBeNull()
  })

  it('reveals a view in the top nav once it is visited via its link', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Service Health' })).toBeNull()
    goto('#/health')
    expect(screen.getByRole('heading', { name: 'Service Health' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Service Health' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1h' })).toHaveClass('active')
  })

  it('keeps previously visited views available after returning home', () => {
    render(<App />)
    goto('#/health')
    goto('#/logs')
    goto('')
    expect(screen.getByRole('button', { name: 'Service Health' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logs' })).toBeInTheDocument()
  })

  it('filters the log stream to a chosen error bucket', async () => {
    const user = userEvent.setup()
    render(<App />)
    goto('#/logs')
    const poolBucket = screen.getByRole('button', { name: /500 Internal Server Error/i })
    await user.click(poolBucket)
    expect(screen.getByText(/Clear filter/i)).toBeInTheDocument()
    // Left panel shows the generic status, but the filtered stream rows keep the raw DB message.
    expect(screen.getAllByText(/connection checkout timed out/i).length).toBeGreaterThan(0)
  })

  it('shows a no-traces message instead of trace waterfalls', () => {
    render(<App />)
    goto('#/traces')
    expect(screen.getByText(/No traces available/i)).toBeInTheDocument()
  })

  it('exposes the config change diff in the changelog', async () => {
    const user = userEvent.setup()
    render(<App />)
    goto('#/changelog')
    expect(screen.getByText(/Update README.md/i)).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'View diff' })[0])
    expect(screen.getByText(/pool_size: 5/i)).toBeInTheDocument()
  })

  it('lists every path on the interviewer directory page', () => {
    render(<App />)
    goto('#/all')
    expect(screen.getByRole('heading', { name: /All paths/i })).toBeInTheDocument()
    expect(screen.getByText('#/health')).toBeInTheDocument()
    expect(screen.getByText('#/endpoints')).toBeInTheDocument()
  })
})
