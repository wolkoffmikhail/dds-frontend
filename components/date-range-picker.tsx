"use client"

import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateRangePickerProps {
  from: string
  to: string
  onFromChange: (date: string) => void
  onToChange: (date: string) => void
}

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
}: DateRangePickerProps) {
  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date-from" className="text-xs text-muted-foreground">
          From
        </Label>
        <div className="relative">
          <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="date-from"
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="pl-9 w-40"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date-to" className="text-xs text-muted-foreground">
          To
        </Label>
        <div className="relative">
          <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="date-to"
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="pl-9 w-40"
          />
        </div>
      </div>
    </div>
  )
}
