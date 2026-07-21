interface StatProps {
  label: string
  value: string
  tone?: 'ok' | 'critical' | 'default'
}

export function Stat({ label, value, tone = 'default' }: StatProps) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone === 'default' ? '' : tone}`.trim()}>{value}</div>
    </div>
  )
}
