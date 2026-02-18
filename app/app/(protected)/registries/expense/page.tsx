"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { DataTable, type Column } from "@/components/data-table"
import { DateRangePicker } from "@/components/date-range-picker"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format, startOfMonth, endOfMonth } from "date-fns"

interface ExpenseRow {
  payment_date: string
  amount: number
  object_name: string | null
  expense_code: string | null
  expense_name: string | null
  payer_name: string | null
  payee_name: string | null
  comment: string | null
  [key: string]: unknown
}

const PAGE_SIZE = 20

export default function ExpenseRegistryPage() {
  const now = new Date()
  const [from, setFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"))
  const [to, setTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"))
  const [objectId, setObjectId] = useState<string>("all")
  const [expenseCodeFilter, setExpenseCodeFilter] = useState("")
  const [payeeEntityId, setPayeeEntityId] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState("payment_date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [data, setData] = useState<ExpenseRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [objects, setObjects] = useState<{ id: string; name: string }[]>([])
  const [entities, setEntities] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from("dim_object_payout")
        .select("id, object_name")
        .order("object_name"),
      supabase
        .from("dim_entity")
        .select("id, entity_name")
        .order("entity_name"),
    ]).then(([objRes, entRes]) => {
      setObjects(
        (objRes.data ?? []).map((r) => ({
          id: String(r.id),
          name: r.object_name,
        }))
      )
      setEntities(
        (entRes.data ?? []).map((r) => ({
          id: String(r.id),
          name: r.entity_name,
        }))
      )
    })
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const offset = (page - 1) * PAGE_SIZE

    let query = supabase
      .from("fct_cash_out")
      .select(
        "payment_date, amount, object_id, expense_code, payer_entity_id, payee_entity_id, comment",
        { count: "exact" }
      )
      .gte("payment_date", from)
      .lte("payment_date", to)
      .order(sortKey as "payment_date", { ascending: sortDir === "asc" })
      .range(offset, offset + PAGE_SIZE - 1)

    if (objectId !== "all") {
      query = query.eq("object_id", objectId)
    }
    if (expenseCodeFilter.trim()) {
      query = query.ilike("expense_code", `%${expenseCodeFilter.trim()}%`)
    }
    if (payeeEntityId !== "all") {
      query = query.eq("payee_entity_id", payeeEntityId)
    }

    const { data: rows, count } = await query

    // Resolve dimension names
    const objIds = [...new Set((rows ?? []).map((r) => r.object_id).filter(Boolean))]
    const entIds = [
      ...new Set([
        ...(rows ?? []).map((r) => r.payer_entity_id).filter(Boolean),
        ...(rows ?? []).map((r) => r.payee_entity_id).filter(Boolean),
      ]),
    ]
    const expCodes = [
      ...new Set((rows ?? []).map((r) => r.expense_code).filter(Boolean)),
    ]

    const [objNames, entNames, expNames] = await Promise.all([
      objIds.length
        ? supabase
            .from("dim_object_payout")
            .select("id, object_name")
            .in("id", objIds)
        : { data: [] },
      entIds.length
        ? supabase
            .from("dim_entity")
            .select("id, entity_name")
            .in("id", entIds)
        : { data: [] },
      expCodes.length
        ? supabase
            .from("dim_expense_code")
            .select("expense_code, expense_name")
            .in("expense_code", expCodes)
        : { data: [] },
    ])

    const objMap = new Map(
      (objNames.data ?? []).map((r) => [String(r.id), r.object_name])
    )
    const entMap = new Map(
      (entNames.data ?? []).map((r) => [String(r.id), r.entity_name])
    )
    const expMap = new Map(
      (expNames.data ?? []).map((r) => [r.expense_code, r.expense_name])
    )

    setData(
      (rows ?? []).map((r) => ({
        payment_date: r.payment_date,
        amount: Number(r.amount) || 0,
        object_name: r.object_id ? objMap.get(String(r.object_id)) ?? null : null,
        expense_code: r.expense_code ?? null,
        expense_name: r.expense_code
          ? expMap.get(r.expense_code) ?? null
          : null,
        payer_name: r.payer_entity_id
          ? entMap.get(String(r.payer_entity_id)) ?? null
          : null,
        payee_name: r.payee_entity_id
          ? entMap.get(String(r.payee_entity_id)) ?? null
          : null,
        comment: r.comment,
      }))
    )
    setTotalCount(count ?? 0)
    setLoading(false)
  }, [from, to, objectId, expenseCodeFilter, payeeEntityId, page, sortKey, sortDir])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setPage(1)
  }, [from, to, objectId, expenseCodeFilter, payeeEntityId])

  const columns: Column<ExpenseRow>[] = [
    { key: "payment_date", label: "Date", sortable: true },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (row) => (
        <span className="font-mono">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
          }).format(row.amount)}
        </span>
      ),
    },
    { key: "object_name", label: "Object" },
    { key: "expense_code", label: "Expense Code" },
    { key: "expense_name", label: "Expense Name" },
    { key: "payer_name", label: "Payer" },
    { key: "payee_name", label: "Payee" },
    { key: "comment", label: "Comment" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Expense Registry
        </h1>
        <p className="text-sm text-muted-foreground">
          All expense transactions with filters and pagination
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <DateRangePicker
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Object</Label>
          <Select value={objectId} onValueChange={setObjectId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Objects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Objects</SelectItem>
              {objects.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Expense Code</Label>
          <Input
            placeholder="Filter by code..."
            value={expenseCodeFilter}
            onChange={(e) => setExpenseCodeFilter(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Payee</Label>
          <Select value={payeeEntityId} onValueChange={setPayeeEntityId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Payees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payees</SelectItem>
              {entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        totalCount={totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSort={(key, dir) => {
          setSortKey(key)
          setSortDir(dir)
        }}
        sortKey={sortKey}
        sortDirection={sortDir}
        loading={loading}
      />
    </div>
  )
}
