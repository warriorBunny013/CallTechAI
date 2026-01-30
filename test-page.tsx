"use client"

import React, { useState } from "react"

export default function TestPage() {
  const [isAnnual, setIsAnnual] = useState(true)
  
  return (
    <div className="flex min-h-screen flex-col">
      <h1>Test</h1>
    </div>
  )
}
