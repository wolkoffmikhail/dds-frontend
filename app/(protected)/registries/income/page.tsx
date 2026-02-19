"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { DataTable, type Column } from "@/components/data-table"
import { DateRangePicker } from "@/components/date-range-picker"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format, startOfMonth, endOfMonth } from "date-fns"

interface IncomeRow {
  income_date: string
  amount: number
  object_name: string | null
  income_article_name: string | null
  payer_name: string | null
  recipient_name: string | null
  comment: string | null
  [key: string]: unknown
}

const PAGE_SIZE = 20

export default function IncomeRegistryPage() {
  const now = new Date()
  const [from, setFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"))
  const [to, setTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"))
  const [objectId, setObjectId] = useState<string>("all")
  const [incomeArticleId, setIncomeArticleId] = useState<string>("all")
  const [payerEntityId, setPayerEntityId] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState("income_date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [data, setData] = useState<IncomeRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Dimension lookups
  const [objects, setObjects] = useState<{ id: string; name: string }[]>([])
  const [articles, setArticles] = useState<{ id: string; name: string }[]>([])
  const [payers, setPayers] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from("dim_object_payout")
        .select("id, object_name")
        .order("object_name"),
      supabase
        .from("dim_income_article")
        .select("id, income_name")
        .order("income_name"),
      supabase
        .from("dim_entity")
        .select("id, entity_name")
        .order("entity_name"),
    ]).then(([objRes, artRes, entRes]) => {
      setObjects(
        (objRes.data ?? []).map((r) => ({
          id: String(r.id),
          name: r.object_name,
        }))
      )
      setArticles(
        (artRes.data ?? []).map((r) => ({
          id: String(r.id),
          name: r.income_name,
        }))
      )
      setPayers(
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
      .from("fct_cash_in")
      .select(
        "income_date, amount, object_id, income_article_id, payer_entity_id, comment",
        { count: "exact" }
      )
      .gte("income_date", from)
      .lte("income_date", to)
      .order(sortKey as "income_date", { ascending: sortDir === "asc" })
      .range(offset, offset + PAGE_SIZE - 1)

    if (objectId !== "all") {
      query = query.eq("object_id", objectId)
    }
    if (incomeArticleId !== "all") {
      query = query.eq("income_article_id", incomeArticleId)
    }
    if (payerEntityId !== "all") {
      query = query.eq("payer_entity_id", payerEntityId)
    }

    const { data: rows, count } = await query

    // Resolve names
    const objIds = [...new Set((rows ?? []).map((r) => r.object_id).filter(Boolean))]
    const artIds = [...new Set((rows ?? []).map((r) => r.income_article_id).filter(Boolean))]
    const entIds = [
      ...new Set((rows ?? []).map((r) => r.payer_entity_id).filter(Boolean)),
    ]

    const [objNames, artNames, entNames] = await Promise.all([
      objIds.length
        ? supabase
            .from("dim_object_payout")
            .select("id, object_name")
            .in("id", objIds)
        : { data: [] },
      artIds.length
        ? supabase
            .from("dim_income_article")
            .select("id, income_name")
            .in("id", artIds)
        : { data: [] },
      entIds.length
        ? supabase
            .from("dim_entity")
            .select("id, entity_name")
            .in("id", entIds)
        : { data: [] },
    ])

    const objMap = new Map(
      (objNames.data ?? []).map((r) => [String(r.id), r.object_name])
    )
    const artMap = new Map(
      (artNames.data ?? []).map((r) => [String(r.id), r.income_name])
    )
    const entMap = new Map(
      (entNames.data ?? []).map((r) => [String(r.id), r.entity_name])
    )

    setData(
      (rows ?? []).map((r) => ({
        income_date: r.income_date,
        amount: Number(r.amount) || 0,
        object_name: r.object_id ? objMap.get(String(r.object_id)) ?? null : null,
        income_article_name: r.income_article_id
          ? artMap.get(String(r.income_article_id)) ?? null
          : null,
        payer_name: r.payer_entity_id
          ? entMap.get(String(r.payer_entity_id)) ?? null
          : null,
        recipient_name: null,
        comment: r.comment,
      }))
    )
    setTotalCount(count ?? 0)
    setLoading(false)
  }, [from, to, objectId, incomeArticleId, payerEntityId, page, sortKey, sortDir])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setPage(1)
  }, [from, to, objectId, incomeArticleId, payerEntityId])

  const columns: Column<IncomeRow>[] = [
    { key: "income_date", label: "Date", sortable: true },
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
    { key: "income_article_name", label: "Income Article" },
    { key: "payer_name", label: "Payer" },
    { key: "recipient_name", label: "Recipient" },
    { key: "comment", label: "Comment" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Income Registry</h1>
        <p className="text-sm text-muted-foreground">
          All income transactions with filters and pagination
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
          <Label className="text-xs text-muted-foreground">
            Income Article
          </Label>
          <Select value={incomeArticleId} onValueChange={setIncomeArticleId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Articles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Articles</SelectItem>
              {articles.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Payer</Label>
          <Select value={payerEntityId} onValueChange={setPayerEntityId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Payers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payers</SelectItem>
              {payers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
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
