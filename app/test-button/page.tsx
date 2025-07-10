"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestButtonPage() {
  const [clickCount, setClickCount] = useState(0)
  const [lastClickTime, setLastClickTime] = useState<string>("")

  const handleClick = () => {
    console.log('Button clicked!')
    setClickCount(prev => prev + 1)
    setLastClickTime(new Date().toLocaleTimeString())
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Button Test</h1>
        <p className="text-muted-foreground">
          Test if button clicks are working
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Button Click Test</CardTitle>
          <CardDescription>
            Click the button to test if it's working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleClick} className="w-full">
            Test Button Click
          </Button>

          <div className="space-y-2">
            <p><strong>Click Count:</strong> {clickCount}</p>
            {lastClickTime && (
              <p><strong>Last Click:</strong> {lastClickTime}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>1. Click the button above</p>
            <p>2. Check the browser console (F12) for "Button clicked!" message</p>
            <p>3. The click count should increase</p>
            <p>4. If this works, the issue is with Vapi, not the button</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 