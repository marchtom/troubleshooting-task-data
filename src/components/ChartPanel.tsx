import type { ReactNode } from 'react'

interface ChartPanelProps {
  title: string
  hint?: string
  legend?: ReactNode
  children: ReactNode
}

export function ChartPanel({ title, hint, legend, children }: ChartPanelProps) {
  return (
    <section className="chart-panel" aria-label={title}>
      <h3>{title}</h3>
      {hint ? <p className="hint">{hint}</p> : null}
      {legend}
      {children}
    </section>
  )
}
