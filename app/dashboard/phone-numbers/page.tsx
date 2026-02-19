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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Plus, Phone, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react"

interface PhoneNumber {
  id: string
  user_id: string
  vapi_phone_number_id: string
  phone_number: string
  country_code: string
  number_type: string
  assistant_id?: string
  vapi_assistant_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Assistant {
  id: string
  vapi_assistant_id: string
  name: string
}

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [numberType, setNumberType] = useState<'free' | 'imported'>('free')

  // Form state for free number
  const [freeNumberData, setFreeNumberData] = useState({
    countryCode: 'US'
  })

  // Form state for imported number
  const [importNumberData, setImportNumberData] = useState({
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumberSid: ''
  })

  useEffect(() => {
    fetchPhoneNumbers()
    fetchAssistants()
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

  const fetchAssistants = async () => {
    try {
      const response = await fetch('/api/assistants')
      if (response.ok) {
        const data = await response.json()
        setAssistants(data.assistants || [])
      }
    } catch (error) {
      console.error('Error fetching assistants:', error)
    }
  }

  const handleCreateFreeNumber = async () => {
    try {
      setIsCreating(true)
      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numberType: 'free',
          countryCode: freeNumberData.countryCode
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create phone number')
      }

      toast({
        title: "Success",
        description: "Phone number created successfully!",
      })

      setIsDialogOpen(false)
      setFreeNumberData({ countryCode: 'US' })
      fetchPhoneNumbers()
    } catch (error: any) {
      console.error('Error creating phone number:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create phone number. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleImportNumber = async () => {
    try {
      setIsCreating(true)
      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numberType: 'imported',
          twilioAccountSid: importNumberData.twilioAccountSid,
          twilioAuthToken: importNumberData.twilioAuthToken,
          twilioPhoneNumberSid: importNumberData.twilioPhoneNumberSid
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import phone number')
      }

      toast({
        title: "Success",
        description: "Phone number imported successfully!",
      })

      setIsImportDialogOpen(false)
      setImportNumberData({
        twilioAccountSid: '',
        twilioAuthToken: '',
        twilioPhoneNumberSid: ''
      })
      fetchPhoneNumbers()
    } catch (error: any) {
      console.error('Error importing phone number:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to import phone number. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleConfigureAssistant = async (phoneNumberId: string, vapiAssistantId: string, assistantId?: string) => {
    try {
      setIsConfiguring(phoneNumberId)
      
      // Use launch endpoint for better integration
      if (assistantId) {
        const launchResponse = await fetch('/api/assistants/launch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumberId,
            assistantId
          }),
        })

        if (!launchResponse.ok) {
          throw new Error('Failed to launch assistant')
        }

        toast({
          title: "🎉 Assistant Launched!",
          description: "Your phone number is now active and ready to receive calls!",
        })
      } else {
        // Fallback to update endpoint
        const response = await fetch(`/api/phone-numbers/${phoneNumberId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vapiAssistantId
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to configure assistant')
        }

        toast({
          title: "Success",
          description: "Assistant configured successfully! Inbound calls will now use this assistant.",
        })
      }

      fetchPhoneNumbers()
    } catch (error) {
      console.error('Error configuring assistant:', error)
      toast({
        title: "Error",
        description: "Failed to configure assistant. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsConfiguring(null)
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
          <h1 className="text-3xl font-bold">Phone Numbers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your phone numbers for inbound and outbound calls
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setNumberType('free')
              setIsDialogOpen(true)
            }}
            className="bg-rose-500 hover:bg-rose-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Free Number
          </Button>
          <Button
            onClick={() => setIsImportDialogOpen(true)}
            variant="outline"
          >
            <Phone className="h-4 w-4 mr-2" />
            Import from Twilio
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : phoneNumbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Phone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No phone numbers yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating a free US phone number or importing one from Twilio
            </p>
            <Button
              onClick={() => {
                setNumberType('free')
                setIsDialogOpen(true)
              }}
              className="bg-rose-500 hover:bg-rose-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Number
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
                    {phone.phone_number}
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
                  {phone.number_type === 'free' ? 'Free US Number' : 'Imported from Twilio'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Country Code</Label>
                  <p className="text-sm text-muted-foreground">{phone.country_code}</p>
                </div>

                {phone.vapi_assistant_id ? (
                  <div>
                    <Label className="text-sm font-medium">Assistant</Label>
                    <p className="text-sm text-muted-foreground">
                      {assistants.find(a => a.vapi_assistant_id === phone.vapi_assistant_id)?.name || 'Configured'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Launch Assistant</Label>
                    <Select
                      onValueChange={(value) => {
                        const assistant = assistants.find(a => a.vapi_assistant_id === value)
                        if (assistant) {
                          handleConfigureAssistant(phone.id, value, assistant.id)
                        }
                      }}
                      disabled={isConfiguring === phone.id || assistants.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assistant to launch" />
                      </SelectTrigger>
                      <SelectContent>
                        {assistants.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No assistants available. Create one first.
                          </SelectItem>
                        ) : (
                          assistants.map((assistant) => (
                            <SelectItem key={assistant.id} value={assistant.vapi_assistant_id}>
                              {assistant.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isConfiguring === phone.id ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Launching...
                        </span>
                      ) : (
                        "Select an assistant to activate this phone number"
                      )}
                    </p>
                  </div>
                )}

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

      {/* Create Free Number Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Free US Phone Number</DialogTitle>
            <DialogDescription>
              Create a free phone number for US national use. You can create up to 10 free numbers per account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Country Code</Label>
              <Select
                value={freeNumberData.countryCode}
                onValueChange={(value) => setFreeNumberData({ countryCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States (US)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Free numbers are only available for US national use
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFreeNumber}
              disabled={isCreating}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Number'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Number Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Phone Number from Twilio</DialogTitle>
            <DialogDescription>
              Import your existing Twilio phone number for international or custom use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Twilio Account SID</Label>
              <Input
                value={importNumberData.twilioAccountSid}
                onChange={(e) =>
                  setImportNumberData({ ...importNumberData, twilioAccountSid: e.target.value })
                }
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div>
              <Label>Twilio Auth Token</Label>
              <Input
                type="password"
                value={importNumberData.twilioAuthToken}
                onChange={(e) =>
                  setImportNumberData({ ...importNumberData, twilioAuthToken: e.target.value })
                }
                placeholder="Your Twilio auth token"
              />
            </div>
            <div>
              <Label>Twilio Phone Number SID</Label>
              <Input
                value={importNumberData.twilioPhoneNumberSid}
                onChange={(e) =>
                  setImportNumberData({ ...importNumberData, twilioPhoneNumberSid: e.target.value })
                }
                placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImportNumber}
              disabled={isCreating}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Number'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

