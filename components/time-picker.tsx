"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export function TimePickerDemo() {
  const [hours, setHours] = React.useState("09")
  const [minutes, setMinutes] = React.useState("00")
  const [ampm, setAmPm] = React.useState("AM")

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    if (value === "") {
      setHours("")
      return
    }

    const numValue = Number.parseInt(value, 10)
    if (numValue >= 0 && numValue <= 12) {
      setHours(numValue.toString().padStart(2, "0"))
    }
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    if (value === "") {
      setMinutes("")
      return
    }

    const numValue = Number.parseInt(value, 10)
    if (numValue >= 0 && numValue <= 59) {
      setMinutes(numValue.toString().padStart(2, "0"))
    }
  }

  const toggleAmPm = () => {
    setAmPm(ampm === "AM" ? "PM" : "AM")
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="grid gap-1 text-center">
        <Input
          type="text"
          inputMode="numeric"
          value={hours}
          onChange={handleHoursChange}
          className="w-12 text-center"
          maxLength={2}
        />
        <Label className="text-xs">Hour</Label>
      </div>
      <div className="grid gap-1 text-center">
        <span className="text-xl">:</span>
        <div className="h-4"></div>
      </div>
      <div className="grid gap-1 text-center">
        <Input
          type="text"
          inputMode="numeric"
          value={minutes}
          onChange={handleMinutesChange}
          className="w-12 text-center"
          maxLength={2}
        />
        <Label className="text-xs">Min</Label>
      </div>
      <div className="grid gap-1">
        <button
          type="button"
          onClick={toggleAmPm}
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {ampm}
        </button>
        <Label className="text-xs text-center">AM/PM</Label>
      </div>
      <div className="grid gap-1">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Clock className="h-4 w-4" />
          <span className="sr-only">Pick a time</span>
        </button>
        <div className="h-4"></div>
      </div>
    </div>
  )
}
