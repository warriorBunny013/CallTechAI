"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Plus, Phone, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"

interface PhoneNumber {
  id: string
  user_id?: string
  organisation_id?: string
  vapi_phone_number_id: string
  phone_number: string
  country_code: string
  number_type: 'free' | 'imported'
  assistant_id?: string
  vapi_assistant_id?: string
  twilio_account_sid?: string | null
  twilio_auth_token?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<'vapi' | 'twilio'>('vapi')

  // Form state: Vapi free number
  const [vapiFormData, setVapiFormData] = useState({
    areaCode: '415',
    countryCode: 'US',
  })

  // Form state: Twilio import
  const [twilioFormData, setTwilioFormData] = useState({
    phoneNumber: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    smsEnabled: true,
    label: '',
  })

  useEffect(() => {
    fetchPhoneNumbers()
  }, [])

  const fetchPhoneNumbers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/phone-numbers')
      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers')
      }
      const data = await response.json()
      setPhoneNumbers(data.phoneNumbers || [])
    } catch (error) {
      console.error('Error fetching phone numbers:', error)
      toast({
        title: "Error",
        description: "Failed to load phone numbers. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddVapiNumber = async () => {
    try {
      setIsCreating(true)
      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'vapi',
          areaCode: vapiFormData.areaCode,
          countryCode: vapiFormData.countryCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add phone number')
      }

      toast({
        title: 'Success',
        description: 'Inbound calls will use your organisation’s voice agent.',
      })
      setIsDialogOpen(false)
      setVapiFormData({ areaCode: '415', countryCode: 'US' })
      fetchPhoneNumbers()
    } catch (error: unknown) {
      console.error('Error adding phone number:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add phone number. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleImportTwilio = async () => {
    if (!twilioFormData.phoneNumber || !twilioFormData.twilioAccountSid) {
      toast({
        title: 'Error',
        description: 'Phone number and Twilio Account SID are required.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsCreating(true)
      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'twilio',
          phoneNumber: twilioFormData.phoneNumber,
          twilioAccountSid: twilioFormData.twilioAccountSid,
          twilioAuthToken: twilioFormData.twilioAuthToken || undefined,
          smsEnabled: twilioFormData.smsEnabled,
          label: twilioFormData.label || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import Twilio number')
      }

      toast({
        title: 'Success',
        description: 'Twilio number imported into Vapi. Inbound calls will use your organisation’s voice agent.',
      })
      setIsDialogOpen(false)
      setTwilioFormData({
        phoneNumber: '',
        twilioAccountSid: '',
        twilioAuthToken: '',
        smsEnabled: true,
        label: '',
      })
      fetchPhoneNumbers()
    } catch (error: unknown) {
      console.error('Error importing Twilio number:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import Twilio number. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this phone number?')) {
      return
    }

    try {
      const response = await fetch(`/api/phone-numbers/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete phone number')
      }

      toast({
        title: "Success",
        description: "Phone number deleted successfully.",
      })

      fetchPhoneNumbers()
    } catch (error) {
      console.error('Error deleting phone number:', error)
      toast({
        title: "Error",
        description: "Failed to delete phone number. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clinic Phone Numbers</h1>
          <p className="text-muted-foreground mt-2">
            import your existing Twilio number. Customers call this number; inbound calls use your organisation’s voice agent and intents.
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Clinic Number
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : phoneNumbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Phone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No clinic numbers yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              import your existing Twilio number. Customers will call this number; inbound calls use your organisation’s voice agent and intents.
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Clinic Number
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {phoneNumbers.map((phone) => (
            <Card key={phone.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    <span>{phone.phone_number}</span>
                    <Badge variant="outline" className="font-normal text-muted-foreground">Clinic number</Badge>
                  </CardTitle>
                  {phone.is_active ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {phone.number_type === 'free' ? 'Vapi free US number' : 'Imported Twilio number'} · Calls use your organisation’s voice agent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Country</Label>
                  <p className="text-sm text-muted-foreground">{phone.country_code}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Inbound calls to this number are answered by your organisation’s selected voice agent and intents. Set the voice in <a href="/dashboard/assistants" className="underline">Assistants</a>.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(phone.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add clinic number dialog with tabs */}
      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            // Reset form state when dialog closes
            setActiveTab('vapi')
            setVapiFormData({ areaCode: '415', countryCode: 'US' })
            setTwilioFormData({
              phoneNumber: '',
              twilioAccountSid: '',
              twilioAuthToken: '',
              smsEnabled: true,
              label: '',
            })
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add clinic number</DialogTitle>
            <DialogDescription>
              Import your existing Twilio number. Both will be connected to Vapi so inbound calls use your organisation’s voice agent.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'vapi' | 'twilio')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              {/* <TabsTrigger value="vapi">Free Vapi Number</TabsTrigger> */}
              <TabsTrigger value="twilio">Import Twilio</TabsTrigger>
            </TabsList>
            
            <TabsContent value="vapi" className="space-y-4 py-4">
              <div>
                <Label>Area code (US, 3 digits)</Label>
                <Input
                  placeholder="e.g. 415"
                  value={vapiFormData.areaCode}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 3)
                    setVapiFormData((prev) => ({ ...prev, areaCode: v || '415' }))
                  }}
                  maxLength={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Vapi will assign a free number in this area code. US only.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddVapiNumber}
                  disabled={isCreating}
                  className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create free number'
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="twilio" className="space-y-4 py-4">
              <div>
                <Label>Twilio Phone Number (E.164 format)</Label>
                <Input
                  placeholder="+14155551234"
                  value={twilioFormData.phoneNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\s+/g, '')
                    setTwilioFormData((prev) => ({ ...prev, phoneNumber: v }))
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The phone number you own on Twilio (e.g., +14155551234)
                </p>
              </div>
              <div>
                <Label>Twilio Account SID *</Label>
                <Input
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={twilioFormData.twilioAccountSid}
                  onChange={(e) =>
                    setTwilioFormData((prev) => ({ ...prev, twilioAccountSid: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Found in your Twilio Console → Account → API Keys & Tokens
                </p>
              </div>
              <div>
                <Label>Twilio Auth Token</Label>
                <Input
                  type="password"
                  placeholder="Your Twilio auth token (optional)"
                  value={twilioFormData.twilioAuthToken}
                  onChange={(e) =>
                    setTwilioFormData((prev) => ({ ...prev, twilioAuthToken: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional. If not provided, Vapi will use your Vapi account’s Twilio credentials.
                </p>
              </div>
              <div>
                <Label>Label (optional)</Label>
                <Input
                  placeholder="Label for phone number"
                  value={twilioFormData.label}
                  onChange={(e) =>
                    setTwilioFormData((prev) => ({ ...prev, label: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable SMS</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable SMS messaging for this phone number
                  </p>
                </div>
                <Switch
                  checked={twilioFormData.smsEnabled}
                  onCheckedChange={(checked) =>
                    setTwilioFormData((prev) => ({ ...prev, smsEnabled: checked }))
                  }
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImportTwilio}
                  disabled={isCreating}
                  className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import from Twilio'
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

