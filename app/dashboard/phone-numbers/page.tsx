"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Plus, Phone, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { getVapiAssistantById } from "@/lib/vapi-assistants"

interface PhoneNumber {
  id: string
  user_id?: string
  organisation_id?: string
  vapi_phone_number_id: string
  phone_number: string
  country_code: string
  number_type: "free" | "imported"
  assistant_id?: string
  vapi_assistant_id?: string
  assistant_name?: string
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
  const [selectedVoiceAgentId, setSelectedVoiceAgentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PhoneNumber | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [twilioFormData, setTwilioFormData] = useState({
    phoneNumber: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    smsEnabled: true,
    label: "",
  })

  useEffect(() => {
    fetchPhoneNumbers()
    fetchAssistants()
    fetch("/api/organisation")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSelectedVoiceAgentId(d?.organisation?.selected_voice_agent_id ?? null))
      .catch(() => {})
  }, [])

  const fetchPhoneNumbers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/phone-numbers")
      if (!response.ok) throw new Error("Failed to fetch phone numbers")
      const data = await response.json()
      setPhoneNumbers(data.phoneNumbers || [])
    } catch (error) {
      console.error("Error fetching phone numbers:", error)
      toast({ title: "Error", description: "Failed to load phone numbers. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAssistants = async () => {
    try {
      const response = await fetch("/api/assistants")
      if (response.ok) {
        const data = await response.json()
        setAssistants(data.assistants || [])
      }
    } catch (error) {
      console.error("Error fetching assistants:", error)
    }
  }

  const handleImportTwilio = async () => {
    if (!twilioFormData.phoneNumber || !twilioFormData.twilioAccountSid) {
      toast({ title: "Error", description: "Phone number and Twilio Account SID are required.", variant: "destructive" })
      return
    }

    try {
      setIsCreating(true)
      const response = await fetch("/api/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "twilio",
          phoneNumber: twilioFormData.phoneNumber,
          twilioAccountSid: twilioFormData.twilioAccountSid,
          twilioAuthToken: twilioFormData.twilioAuthToken || undefined,
          smsEnabled: twilioFormData.smsEnabled,
          label: twilioFormData.label || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to import Twilio number")

      toast({ title: "Success", description: "Twilio number imported. Inbound calls will use your organisation's voice agent." })
      setIsDialogOpen(false)
      setTwilioFormData({ phoneNumber: "", twilioAccountSid: "", twilioAuthToken: "", smsEnabled: true, label: "" })
      fetchPhoneNumbers()
    } catch (error: unknown) {
      console.error("Error importing Twilio number:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import Twilio number. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleConfigureAssistant = async (phoneNumberId: string, vapiAssistantId: string, assistantId?: string) => {
    try {
      setIsConfiguring(phoneNumberId)

      if (assistantId) {
        const launchResponse = await fetch("/api/assistants/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumberId, assistantId }),
        })
        if (!launchResponse.ok) throw new Error("Failed to launch assistant")
        toast({ title: "Assistant Launched!", description: "Your phone number is now active and ready to receive calls!" })
      } else {
        const response = await fetch(`/api/phone-numbers/${phoneNumberId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vapiAssistantId }),
        })
        if (!response.ok) throw new Error("Failed to configure assistant")
        toast({ title: "Success", description: "Assistant configured. Inbound calls will now use this assistant." })
      }

      fetchPhoneNumbers()
    } catch (error) {
      console.error("Error configuring assistant:", error)
      toast({ title: "Error", description: "Failed to configure assistant. Please try again.", variant: "destructive" })
    } finally {
      setIsConfiguring(null)
    }
  }

  const handleDeleteClick = (phone: PhoneNumber) => setDeleteTarget(phone)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/phone-numbers/${deleteTarget.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete phone number")
      toast({ title: "Deleted", description: "Phone number removed from your dashboard and from the provider." })
      setDeleteTarget(null)
      fetchPhoneNumbers()
    } catch (error) {
      console.error("Error deleting phone number:", error)
      toast({ title: "Error", description: "Failed to delete phone number. Please try again.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-black dark:to-[#0A0A0A] p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">

          {/* Header */}
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                Phone Numbers
              </h1>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                Import your Twilio phone number. Customers call this number; inbound calls use your organisation&apos;s voice agent and intents.
              </p>
            </div>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-semibold h-11 px-6 rounded-xl shadow-lg shadow-[#84CC16]/25 hover:shadow-[#84CC16]/40 transition-all self-start"
            >
              <Plus className="h-4 w-4 mr-2" />
              Import from Twilio
            </Button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[#84CC16]/10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#84CC16]" />
                </div>
                <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">Loading phone numbers...</span>
              </div>
            </div>
          ) : phoneNumbers.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
              <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-white/5 mb-4">
                <Phone className="h-8 w-8 text-gray-400 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No phone numbers yet</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6 max-w-sm">
                Import your existing Twilio number. Customers will call this number; inbound calls use your organisation&apos;s voice agent and intents.
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-semibold rounded-xl shadow-lg shadow-[#84CC16]/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Import Your First Number
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {phoneNumbers.map((phone) => (
                <div
                  key={phone.id}
                  className="group p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 dark:hover:border-[#84CC16]/50 hover:shadow-lg hover:shadow-[#84CC16]/5 transition-all duration-300"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#84CC16]/10 group-hover:scale-110 transition-transform duration-300">
                        <Phone className="h-5 w-5 text-[#84CC16]" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white font-mono">{phone.phone_number}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                          {phone.number_type === "free" ? "Free US number" : "Imported from Twilio"}
                        </p>
                      </div>
                    </div>
                    {phone.is_active ? (
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0 font-semibold">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse mr-1.5" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 border-0 font-medium">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>

                  {/* Country Code */}
                  <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-0.5">Country Code</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{phone.country_code}</p>
                  </div>

                  {/* Assistant */}
                  <div className="mb-5">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-2">Assistant</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {phone.vapi_assistant_id ? (
                        <Badge className="bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/20 font-semibold">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Activated
                        </Badge>
                      ) : (
                        <>
                          <Badge className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 border-0 font-medium">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not activated
                          </Badge>
                          {selectedVoiceAgentId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConfigureAssistant(phone.id, selectedVoiceAgentId)}
                              disabled={isConfiguring === phone.id}
                              className="rounded-xl border-[#84CC16]/30 text-[#84CC16] hover:bg-[#84CC16]/10 font-semibold h-7 text-xs"
                            >
                              {isConfiguring === phone.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Activate"
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(phone)}
                      className="w-full rounded-xl border-red-200 bg-red-900/10 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Number
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import from Twilio Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setTwilioFormData({ phoneNumber: "", twilioAccountSid: "", twilioAuthToken: "", smsEnabled: true, label: "" })
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl border-gray-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Import Phone Number from Twilio</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Import your existing Twilio phone number. Inbound calls will use your organisation&apos;s voice agent and intents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="font-semibold text-gray-900 dark:text-white">Twilio Phone Number (E.164 format)</Label>
              <Input
                placeholder="+14155551234"
                value={twilioFormData.phoneNumber}
                onChange={(e) => {
                  const v = e.target.value.replace(/\s+/g, "")
                  setTwilioFormData((prev) => ({ ...prev, phoneNumber: v }))
                }}
                className="mt-1.5 rounded-xl border-gray-200 dark:border-white/10 focus:border-[#84CC16]"
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">The phone number you own on Twilio (e.g., +14155551234)</p>
            </div>
            <div>
              <Label className="font-semibold text-gray-900 dark:text-white">Twilio Account SID *</Label>
              <Input
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={twilioFormData.twilioAccountSid}
                onChange={(e) => setTwilioFormData((prev) => ({ ...prev, twilioAccountSid: e.target.value }))}
                className="mt-1.5 rounded-xl border-gray-200 dark:border-white/10 focus:border-[#84CC16]"
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Found in Twilio Console → Account → API Keys & Tokens</p>
            </div>
            <div>
              <Label className="font-semibold text-gray-900 dark:text-white">Twilio Auth Token</Label>
              <Input
                type="password"
                placeholder="Your Twilio auth token (optional)"
                value={twilioFormData.twilioAuthToken}
                onChange={(e) => setTwilioFormData((prev) => ({ ...prev, twilioAuthToken: e.target.value }))}
                className="mt-1.5 rounded-xl border-gray-200 dark:border-white/10 focus:border-[#84CC16]"
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Optional. If not provided, Vapi may use your Vapi account&apos;s Twilio credentials.</p>
            </div>
            <div>
              <Label className="font-semibold text-gray-900 dark:text-white">Label (optional)</Label>
              <Input
                placeholder="Label for phone number"
                value={twilioFormData.label}
                onChange={(e) => setTwilioFormData((prev) => ({ ...prev, label: e.target.value }))}
                className="mt-1.5 rounded-xl border-gray-200 dark:border-white/10 focus:border-[#84CC16]"
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
              <div>
                <Label className="font-semibold text-gray-900 dark:text-white">Enable SMS</Label>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Enable SMS messaging for this phone number</p>
              </div>
              <Switch
                checked={twilioFormData.smsEnabled}
                onCheckedChange={(checked) => setTwilioFormData((prev) => ({ ...prev, smsEnabled: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl border-gray-200 dark:border-white/10 font-semibold">
              Cancel
            </Button>
            <Button
              onClick={handleImportTwilio}
              disabled={isCreating}
              className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-semibold rounded-xl shadow-lg shadow-[#84CC16]/25"
            >
              {isCreating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
              ) : (
                "Import from Twilio"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-gray-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete phone number?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              This will remove {deleteTarget?.phone_number} from your dashboard and from the provider. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl border-gray-200 dark:border-white/10 font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteConfirm() }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
            >
              {isDeleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </>
  )
}
