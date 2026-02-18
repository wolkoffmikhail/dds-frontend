"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

interface CashflowChartProps {
  data: { dt: string; inflow: number; outflow: number; net: number }[]
  loading?: boolean
}

const seriesConfig = [
  { key: "net", label: "Net", color: "var(--color-chart-1)" },
  { key: "inflow", label: "Inflow", color: "var(--color-chart-2)" },
  { key: "outflow", label: "Outflow", color: "var(--color-chart-3)" },
] as const

export function CashflowChart({ data, loading }: CashflowChartProps) {
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(["net", "inflow", "outflow"])
  )

  const toggleSeries = (key: string) => {
    setVisibleSeries((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Daily Cash Flow
        </CardTitle>
        <div className="flex items-center gap-1">
          {seriesConfig.map((s) => (
            <Button
              key={s.key}
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs",
                visibleSeries.has(s.key)
                  ? "text-foreground"
                  : "text-muted-foreground/50"
              )}
              onClick={() => toggleSeries(s.key)}
            >
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: visibleSeries.has(s.key)
                    ? s.color
                    : "var(--color-muted)",
                }}
              />
              {s.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-72 animate-pulse rounded bg-muted" />
        ) : data.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No data available for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="dt"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  const d = new Date(val)
                  return `${d.getMonth() + 1}/${d.getDate()}`
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) =>
                  new Intl.NumberFormat("en-US", {
                    notation: "compact",
                    compactDisplay: "short",
                  }).format(val)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  borderColor: "var(--color-border)",
                  borderRadius: "var(--radius)",
                  fontSize: 12,
                  color: "var(--color-card-foreground)",
                }}
                formatter={(value: number, name: string) => [
                  new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 0,
                  }).format(value),
                  name.charAt(0).toUpperCase() + name.slice(1),
                ]}
                labelFormatter={(label) => {
                  const d = new Date(label)
                  return d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                }}
              />
              {seriesConfig.map((s) =>
                visibleSeries.has(s.key) ? (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ) : null
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
