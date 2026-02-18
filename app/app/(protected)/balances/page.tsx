"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { DataTable, type Column } from "@/components/data-table"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BalanceRow {
  balance_object_name: string | null
  snapshot_date: string
  balance: number
  bank_name: string | null
  payer_name: string | null
  [key: string]: unknown
}

const PAGE_SIZE = 20

export default function BalancesPage() {
  const [payerEntityId, setPayerEntityId] = useState<string>("all")
  const [bankId, setBankId] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState("snapshot_date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [data, setData] = useState<BalanceRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [entities, setEntities] = useState<{ id: string; name: string }[]>([])
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from("dim_entity")
        .select("id, entity_name")
        .order("entity_name"),
      supabase.from("dim_bank").select("id, bank_name").order("bank_name"),
    ]).then(([entRes, bankRes]) => {
      setEntities(
        (entRes.data ?? []).map((r) => ({
          id: String(r.id),
          name: r.entity_name,
        }))
      )
      setBanks(
        (bankRes.data ?? []).map((r) => ({
          id: String(r.id),
          name: r.bank_name,
        }))
      )
    })
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const offset = (page - 1) * PAGE_SIZE

    let query = supabase
      .from("v_latest_balance_per_balance_object")
      .select(
        "balance_object_id, snapshot_date, balance, bank_id, payer_entity_id",
        { count: "exact" }
      )
      .order(sortKey as "snapshot_date", { ascending: sortDir === "asc" })
      .range(offset, offset + PAGE_SIZE - 1)

    if (payerEntityId !== "all") {
      query = query.eq("payer_entity_id", payerEntityId)
    }
    if (bankId !== "all") {
      query = query.eq("bank_id", bankId)
    }

    const { data: rows, count } = await query

    // Resolve dimension names
    const balObjIds = [
      ...new Set((rows ?? []).map((r) => r.balance_object_id).filter(Boolean)),
    ]
    const bIds = [
      ...new Set((rows ?? []).map((r) => r.bank_id).filter(Boolean)),
    ]
    const eIds = [
      ...new Set((rows ?? []).map((r) => r.payer_entity_id).filter(Boolean)),
    ]

    const [balObjNames, bankNames, entNames] = await Promise.all([
      balObjIds.length
        ? supabase
            .from("dim_object_balance")
            .select("id, balance_object_name")
            .in("id", balObjIds)
        : { data: [] },
      bIds.length
        ? supabase
            .from("dim_bank")
            .select("id, bank_name")
            .in("id", bIds)
        : { data: [] },
      eIds.length
        ? supabase
            .from("dim_entity")
            .select("id, entity_name")
            .in("id", eIds)
        : { data: [] },
    ])

    const balObjMap = new Map(
      (balObjNames.data ?? []).map((r) => [
        String(r.id),
        r.balance_object_name,
      ])
    )
    const bankMap = new Map(
      (bankNames.data ?? []).map((r) => [String(r.id), r.bank_name])
    )
    const entMap = new Map(
      (entNames.data ?? []).map((r) => [String(r.id), r.entity_name])
    )

    setData(
      (rows ?? []).map((r) => ({
        balance_object_name: r.balance_object_id
          ? balObjMap.get(String(r.balance_object_id)) ?? String(r.balance_object_id)
          : null,
        snapshot_date: r.snapshot_date,
        balance: Number(r.balance) || 0,
        bank_name: r.bank_id ? bankMap.get(String(r.bank_id)) ?? null : null,
        payer_name: r.payer_entity_id
          ? entMap.get(String(r.payer_entity_id)) ?? null
          : null,
      }))
    )
    setTotalCount(count ?? 0)
    setLoading(false)
  }, [payerEntityId, bankId, page, sortKey, sortDir])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setPage(1)
  }, [payerEntityId, bankId])

  const columns: Column<BalanceRow>[] = [
    { key: "balance_object_name", label: "Balance Object" },
    { key: "snapshot_date", label: "Snapshot Date", sortable: true },
    {
      key: "balance",
      label: "Balance",
      sortable: true,
      render: (row) => (
        <span className="font-mono">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
          }).format(row.balance)}
        </span>
      ),
    },
    { key: "bank_name", label: "Bank" },
    { key: "payer_name", label: "Payer Entity" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Balances</h1>
        <p className="text-sm text-muted-foreground">
          Latest balance per balance object
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Payer Entity</Label>
          <Select value={payerEntityId} onValueChange={setPayerEntityId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Bank</Label>
          <Select value={bankId} onValueChange={setBankId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Banks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Banks</SelectItem>
              {banks.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
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
