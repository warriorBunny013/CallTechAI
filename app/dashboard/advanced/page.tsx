"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Save, BellIcon as BrandTelegram, MessageSquare, Phone } from "lucide-react"

export default function AdvancedPage() {
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [telegramToken, setTelegramToken] = useState("")
  const [telegramUsername, setTelegramUsername] = useState("")

  const [crmEnabled, setCrmEnabled] = useState(false)
  const [crmApiKey, setCrmApiKey] = useState("")
  const [crmEndpoint, setCrmEndpoint] = useState("")

  const [smsEnabled, setSmsEnabled] = useState(false)
  const [smsApiKey, setSmsApiKey] = useState("")
  const [smsPhoneNumber, setSmsPhoneNumber] = useState("")

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)

    // Simulate saving data
    setTimeout(() => {
      console.log({
        telegramEnabled,
        telegramToken,
        telegramUsername,
        crmEnabled,
        crmApiKey,
        crmEndpoint,
        smsEnabled,
        smsApiKey,
        smsPhoneNumber,
      })

      setIsSaving(false)
      toast({
        title: "Settings saved",
        description: "Your advanced settings have been updated successfully.",
      })
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Advanced Settings</h1>
        <p className="text-muted-foreground">
          Configure integrations and advanced features for your AI voice assistant.
        </p>
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BrandTelegram className="mr-2 h-5 w-5" />
                Telegram Integration
              </CardTitle>
              <CardDescription>Connect your assistant to Telegram to provide support through messaging</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="telegram-enabled" checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
                <Label htmlFor="telegram-enabled">Enable Telegram Integration</Label>
              </div>

              {telegramEnabled && (
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="telegram-token">Telegram Bot Token</Label>
                    <Input
                      id="telegram-token"
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      placeholder="Enter your Telegram bot token"
                      type="password"
                    />
                    <p className="text-sm text-muted-foreground">You can get a token from @BotFather on Telegram.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegram-username">Bot Username</Label>
                    <Input
                      id="telegram-username"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                      placeholder="@YourBotUsername"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                CRM Integration
              </CardTitle>
              <CardDescription>Connect your assistant to your CRM system to log conversations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="crm-enabled" checked={crmEnabled} onCheckedChange={setCrmEnabled} />
                <Label htmlFor="crm-enabled">Enable CRM Integration</Label>
              </div>

              {crmEnabled && (
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="crm-api-key">API Key</Label>
                    <Input
                      id="crm-api-key"
                      value={crmApiKey}
                      onChange={(e) => setCrmApiKey(e.target.value)}
                      placeholder="Enter your CRM API key"
                      type="password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="crm-endpoint">API Endpoint</Label>
                    <Input
                      id="crm-endpoint"
                      value={crmEndpoint}
                      onChange={(e) => setCrmEndpoint(e.target.value)}
                      placeholder="https://your-crm.com/api"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                SMS Notifications
              </CardTitle>
              <CardDescription>Receive SMS notifications for important events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="sms-enabled" checked={smsEnabled} onCheckedChange={setSmsEnabled} />
                <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
              </div>

              {smsEnabled && (
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms-api-key">SMS Provider API Key</Label>
                    <Input
                      id="sms-api-key"
                      value={smsApiKey}
                      onChange={(e) => setSmsApiKey(e.target.value)}
                      placeholder="Enter your SMS provider API key"
                      type="password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sms-phone">Your Phone Number</Label>
                    <Input
                      id="sms-phone"
                      value={smsPhoneNumber}
                      onChange={(e) => setSmsPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                    <p className="text-sm text-muted-foreground">Include country code (e.g., +1 for US)</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>Set up webhooks to receive real-time notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input id="webhook-url" placeholder="https://your-server.com/webhook" />
                <p className="text-sm text-muted-foreground">We'll send POST requests to this URL when events occur.</p>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label>Events to Notify</Label>
                <div className="grid gap-2 pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="event-call-start" />
                    <Label htmlFor="event-call-start">Call Started</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="event-call-end" />
                    <Label htmlFor="event-call-end">Call Ended</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="event-intent-matched" />
                    <Label htmlFor="event-intent-matched">Intent Matched</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="event-fallback" />
                    <Label htmlFor="event-fallback">Fallback Triggered</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Settings</CardTitle>
              <CardDescription>Configure analytics and reporting preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Data Collection</Label>
                <div className="grid gap-2 pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="collect-call-duration" defaultChecked />
                    <Label htmlFor="collect-call-duration">Call Duration</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="collect-intent-usage" defaultChecked />
                    <Label htmlFor="collect-intent-usage">Intent Usage</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="collect-fallback-rate" defaultChecked />
                    <Label htmlFor="collect-fallback-rate">Fallback Rate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="collect-transcripts" />
                    <Label htmlFor="collect-transcripts">Call Transcripts</Label>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label>Reporting</Label>
                <div className="grid gap-2 pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="weekly-report" defaultChecked />
                    <Label htmlFor="weekly-report">Weekly Email Report</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="monthly-report" defaultChecked />
                    <Label htmlFor="monthly-report">Monthly Detailed Report</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="bg-rose-500 hover:bg-rose-600">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Toaster />
    </div>
  )
}