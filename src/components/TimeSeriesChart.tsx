import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface SeriesDef {
  dataKey: string
  name: string
  color: string
}

interface TimeSeriesChartProps {
  data: Array<Record<string, string | number> | object>
  series: SeriesDef[]
  yUnit?: string
  yDomain?: [number | 'auto', number | 'auto']
}

export function TimeSeriesChart({ data, series, yUnit, yDomain }: TimeSeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#243247" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#6b7f96', fontSize: 11 }}
          minTickGap={28}
          stroke="#2c3a4d"
        />
        <YAxis
          tick={{ fill: '#6b7f96', fontSize: 11 }}
          stroke="#2c3a4d"
          domain={yDomain}
          width={48}
          tickFormatter={(v: number) => (yUnit === '%' ? `${v}` : `${v}`)}
        />
        <Tooltip
          contentStyle={{
            background: '#161d27',
            border: '1px solid #2c3a4d',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: '#8fa3bb' }}
          formatter={(value, name) => {
            const n = typeof value === 'number' ? value : Number(value)
            const formatted = Number.isFinite(n)
              ? yUnit === '%'
                ? `${n.toFixed(2)}%`
                : yUnit === 'ms'
                  ? `${Math.round(n)} ms`
                  : n.toLocaleString()
              : String(value)
            return [formatted, String(name)]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#8fa3bb' }} />
        {series.map((s) => (
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name}
            stroke={s.color}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
