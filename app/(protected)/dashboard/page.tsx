"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { KpiCard } from "@/components/kpi-card"
import { DateRangePicker } from "@/components/date-range-picker"
import { CashflowChart } from "@/components/cashflow-chart"
import { TopExpensesTable } from "@/components/top-expenses-table"
import { Wallet, ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react"
import { format, startOfMonth, endOfMonth } from "date-fns"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function DashboardPage() {
  const now = new Date()
  const [from, setFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"))
  const [to, setTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"))
  const [kpis, setKpis] = useState({
    balance: 0,
    inflow: 0,
    outflow: 0,
    net: 0,
  })
  const [chartData, setChartData] = useState<
    { dt: string; inflow: number; outflow: number; net: number }[]
  >([])
  const [topExpenses, setTopExpenses] = useState<
    { expense_code: string; expense_name: string; total: number }[]
  >([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [balanceRes, inflowRes, outflowRes, chartRes, expenseRes] =
      await Promise.all([
        supabase
          .from("v_latest_balance_per_balance_object")
          .select("balance"),
        supabase
          .from("fct_cash_in")
          .select("amount")
          .gte("income_date", from)
          .lte("income_date", to),
        supabase
          .from("fct_cash_out")
          .select("amount")
          .gte("payment_date", from)
          .lte("payment_date", to),
        supabase
          .from("v_cashflow_daily")
          .select("dt, inflow, outflow, net")
          .gte("dt", from)
          .lte("dt", to)
          .order("dt", { ascending: true }),
        supabase
          .from("fct_cash_out")
          .select("expense_code, amount")
          .gte("payment_date", from)
          .lte("payment_date", to),
      ])

    const totalBalance =
      balanceRes.data?.reduce(
        (sum, r) => sum + (Number(r.balance) || 0),
        0
      ) ?? 0

    const totalInflow =
      inflowRes.data?.reduce(
        (sum, r) => sum + (Number(r.amount) || 0),
        0
      ) ?? 0

    const totalOutflow =
      outflowRes.data?.reduce(
        (sum, r) => sum + (Number(r.amount) || 0),
        0
      ) ?? 0

    setKpis({
      balance: totalBalance,
      inflow: totalInflow,
      outflow: totalOutflow,
      net: totalInflow - totalOutflow,
    })

    setChartData(
      (chartRes.data ?? []).map((r) => ({
        dt: r.dt,
        inflow: Number(r.inflow) || 0,
        outflow: Number(r.outflow) || 0,
        net: Number(r.net) || 0,
      }))
    )

    // Aggregate expenses by code client-side, then fetch dim_expense_code
    const expenseMap = new Map<string, number>()
    for (const r of expenseRes.data ?? []) {
      const code = r.expense_code ?? "UNKNOWN"
      expenseMap.set(code, (expenseMap.get(code) ?? 0) + (Number(r.amount) || 0))
    }
    const sortedExpenses = Array.from(expenseMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // Fetch expense code names
    const codes = sortedExpenses.map(([code]) => code)
    const dimRes = codes.length
      ? await supabase
          .from("dim_expense_code")
          .select("expense_code, expense_name")
          .in("expense_code", codes)
      : { data: [] }

    const nameMap = new Map(
      (dimRes.data ?? []).map((r) => [r.expense_code, r.expense_name])
    )

    setTopExpenses(
      sortedExpenses.map(([code, total]) => ({
        expense_code: code,
        expense_name: nameMap.get(code) ?? code,
        total,
      }))
    )

    setLoading(false)
  }, [from, to])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Cash flow overview for the selected period
          </p>
        </div>
        <DateRangePicker
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Balance"
          value={formatCurrency(kpis.balance)}
          icon={Wallet}
          description="Latest balance across all objects"
          loading={loading}
        />
        <KpiCard
          title="Inflow"
          value={formatCurrency(kpis.inflow)}
          icon={ArrowDownLeft}
          trend="up"
          description="Total income for period"
          loading={loading}
        />
        <KpiCard
          title="Outflow"
          value={formatCurrency(kpis.outflow)}
          icon={ArrowUpRight}
          trend="down"
          description="Total expenses for period"
          loading={loading}
        />
        <KpiCard
          title="Net Cash Flow"
          value={formatCurrency(kpis.net)}
          icon={TrendingUp}
          trend={kpis.net >= 0 ? "up" : "down"}
          description="Inflow minus outflow"
          loading={loading}
        />
      </div>

      <CashflowChart data={chartData} loading={loading} />
      <TopExpensesTable data={topExpenses} loading={loading} />
    </div>
  )
}
