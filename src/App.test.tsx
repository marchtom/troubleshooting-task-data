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

  it('notes that customers are mainly in the USA', () => {
    render(<App />)
    expect(screen.getByText(/customers are mainly in the USA/i)).toBeInTheDocument()
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

  it('supports the 7d range in the instances view', async () => {
    const user = userEvent.setup()
    render(<App />)
    goto('#/instances')
    const range = screen.getByRole('button', { name: '7d' })
    await user.click(range)
    expect(range).toHaveClass('active')
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

  it('reaches back to the start of the window when filtering by level', async () => {
    const user = userEvent.setup()
    render(<App />)
    goto('#/logs')

    await user.click(screen.getByRole('button', { name: 'error' }))
    expect(screen.getAllByText(/^15:3\d:\d\d$/).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'warn' }))
    const earlyWarnRows = screen.getAllByText(/^15:3\d:\d\d$/)
    expect(earlyWarnRows.length).toBeGreaterThan(0)
    expect(screen.getAllByText(/slow downstream call/i).length).toBeGreaterThan(0)
  })

  it('shows a no-traces message instead of trace waterfalls', () => {
    render(<App />)
    goto('#/traces')
    expect(screen.getByText(/No traces available/i)).toBeInTheDocument()
  })

  it('shows the SWE config deploy time and diff on #/changelog-swe', async () => {
    const user = userEvent.setup()
    render(<App />)
    goto('#/changelog-swe')
    expect(screen.getByRole('button', { name: 'Changelog' })).toBeInTheDocument()
    expect(screen.getByText(/15:50 UTC/i)).toBeInTheDocument()
    expect(screen.queryByText(/10:00 UTC/i)).toBeNull()
    expect(screen.getByText(/Update README.md/i)).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'View diff' })[0])
    expect(screen.getByText(/pool_size: 5/i)).toBeInTheDocument()
  })

  it('shows the Senior config deploy time on #/changelog-senior', () => {
    render(<App />)
    goto('#/changelog-senior')
    expect(screen.getByRole('button', { name: 'Changelog' })).toBeInTheDocument()
    expect(screen.getByText(/10:00 UTC/i)).toBeInTheDocument()
    expect(screen.queryByText(/15:50 UTC/i)).toBeNull()
    // Within Today, newest-first: config @ 10:00 is last.
    const todayTimes = screen
      .getAllByText(/\d{2}:\d{2} UTC/)
      .map((el) => el.textContent ?? '')
      .filter((t) => /14:05|11:20|10:00/.test(t))
    expect(todayTimes).toEqual([
      expect.stringContaining('14:05 UTC'),
      expect.stringContaining('11:20 UTC'),
      expect.stringContaining('10:00 UTC'),
    ])
  })

  it('lists changelog level aliases on the interviewer directory page', () => {
    render(<App />)
    goto('#/all')
    expect(screen.getByRole('heading', { name: /All paths/i })).toBeInTheDocument()
    expect(screen.getByText('#/health')).toBeInTheDocument()
    expect(screen.getByText('#/endpoints')).toBeInTheDocument()
    expect(screen.getByText('#/changelog-swe')).toBeInTheDocument()
    expect(screen.getByText('#/changelog-senior')).toBeInTheDocument()
    expect(screen.getByText(/Changelog · SWE 2\/3/i)).toBeInTheDocument()
    expect(screen.getByText(/Changelog · Senior\/Staff/i)).toBeInTheDocument()
  })
})
