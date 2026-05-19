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
import { Plus, Phone, Trash2, Loader2, CheckCircle2, XCircle, Bot } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface PhoneNumber {
  id: string
  user_id?: string
  organisation_id?: string
  phone_number: string
  country_code: string
  number_type: "free" | "imported"
  assistant_id?: string | null
  elevenlabs_agent_id?: string | null
  assistant_name?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface OrgAssistant {
  id: string
  elevenlabs_agent_id: string
  name: string
  is_default: boolean
}

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [assistants, setAssistants] = useState<OrgAssistant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState<PhoneNumber | null>(null)
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
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
      const response = await fetch("/api/assistants/list")
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
    if (!twilioFormData.twilioAuthToken) {
      toast({ title: "Error", description: "Twilio Auth Token is required.", variant: "destructive" })
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
          twilioAuthToken: twilioFormData.twilioAuthToken,
          smsEnabled: twilioFormData.smsEnabled,
          label: twilioFormData.label || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to import Twilio number")

      toast({
        title: "Number imported!",
        description: "Inbound calls will be handled by your AI assistant automatically.",
      })
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

  const openAssignDialog = (phone: PhoneNumber) => {
    setAssignTarget(phone)
    // Pre-select currently linked assistant or default
    if (phone.assistant_id) {
      setSelectedAssistantId(phone.assistant_id)
    } else {
      const defaultAssistant = assistants.find((a) => a.is_default)
      setSelectedAssistantId(defaultAssistant?.id ?? assistants[0]?.id ?? "")
    }
    setIsAssignDialogOpen(true)
  }

  const handleAssignAssistant = async () => {
    if (!assignTarget || !selectedAssistantId) return
    setIsAssigning(true)
    try {
      const response = await fetch("/api/assistants/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: assignTarget.id,
          assistantRowId: selectedAssistantId,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to assign assistant")
      toast({ title: "Assistant assigned", description: data.message ?? "Inbound calls will use this assistant." })
      setIsAssignDialogOpen(false)
      fetchPhoneNumbers()
    } catch (error) {
      console.error("Error assigning assistant:", error)
      toast({ title: "Error", description: "Failed to assign assistant. Please try again.", variant: "destructive" })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleDeleteClick = (phone: PhoneNumber) => setDeleteTarget(phone)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/phone-numbers/${deleteTarget.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete phone number")
      toast({ title: "Deleted", description: "Phone number removed from your dashboard." })
      setDeleteTarget(null)
      fetchPhoneNumbers()
    } catch (error) {
      console.error("Error deleting phone number:", error)
      toast({ title: "Error", description: "Failed to delete phone number. Please try again.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const getAssistantName = (phone: PhoneNumber): string | null => {
    if (phone.assistant_id) {
      const assistant = assistants.find((a) => a.id === phone.assistant_id)
      if (assistant) return assistant.name
    }
    if (phone.elevenlabs_agent_id) {
      const assistant = assistants.find((a) => a.elevenlabs_agent_id === phone.elevenlabs_agent_id)
      if (assistant) return assistant.name
    }
    if (phone.assistant_name) return phone.assistant_name
    // Falls back to org default
    const defaultAssistant = assistants.find((a) => a.is_default)
    return defaultAssistant?.name ?? null
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
                Import your Twilio phone number. Inbound calls are automatically routed to your AI voice assistant.
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
                Import your Twilio number. Inbound calls will be automatically handled by your AI assistant.
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
              {phoneNumbers.map((phone) => {
                const assistantName = getAssistantName(phone)
                return (
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

                    {/* AI Assistant */}
                    <div className="mb-5">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-2">AI Assistant</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {assistantName ? (
                          <Badge className="bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/20 font-semibold gap-1.5">
                            <Bot className="h-3 w-3" />
                            {assistantName}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 border-0 font-medium">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Org default
                          </Badge>
                        )}
                        {assistants.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAssignDialog(phone)}
                            className="h-6 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2"
                          >
                            Change
                          </Button>
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
                )
              })}
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
              Import your Twilio phone number. We&apos;ll configure the webhook automatically so inbound calls reach your AI assistant.
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
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Found in Twilio Console → Account → API Keys &amp; Tokens</p>
            </div>
            <div>
              <Label className="font-semibold text-gray-900 dark:text-white">Twilio Auth Token *</Label>
              <Input
                type="password"
                placeholder="Your Twilio auth token"
                value={twilioFormData.twilioAuthToken}
                onChange={(e) => setTwilioFormData((prev) => ({ ...prev, twilioAuthToken: e.target.value }))}
                className="mt-1.5 rounded-xl border-gray-200 dark:border-white/10 focus:border-[#84CC16]"
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Required to configure the Twilio webhook automatically.</p>
            </div>
            <div>
              <Label className="font-semibold text-gray-900 dark:text-white">Label (optional)</Label>
              <Input
                placeholder="Label for this number"
                value={twilioFormData.label}
                onChange={(e) => setTwilioFormData((prev) => ({ ...prev, label: e.target.value }))}
                className="mt-1.5 rounded-xl border-gray-200 dark:border-white/10 focus:border-[#84CC16]"
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
              <div>
                <Label className="font-semibold text-gray-900 dark:text-white">Enable SMS</Label>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Enable SMS messaging for this number</p>
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

      {/* Assign Assistant Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-gray-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Assign AI Assistant</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Choose which AI assistant handles inbound calls on{" "}
              <span className="font-mono font-semibold">{assignTarget?.phone_number}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="font-semibold text-gray-900 dark:text-white mb-2 block">Assistant</Label>
            <Select value={selectedAssistantId} onValueChange={setSelectedAssistantId}>
              <SelectTrigger className="rounded-xl border-gray-200 dark:border-white/10">
                <SelectValue placeholder="Select an assistant" />
              </SelectTrigger>
              <SelectContent>
                {assistants.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}{a.is_default ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} className="rounded-xl border-gray-200 dark:border-white/10 font-semibold">
              Cancel
            </Button>
            <Button
              onClick={handleAssignAssistant}
              disabled={isAssigning || !selectedAssistantId}
              className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-semibold rounded-xl shadow-lg shadow-[#84CC16]/25"
            >
              {isAssigning ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning...</>
              ) : (
                "Assign Assistant"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-gray-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete phone number?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              This will remove {deleteTarget?.phone_number} from your dashboard. The Twilio webhook will remain
              until you clear it manually in the Twilio Console. This action cannot be undone.
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
