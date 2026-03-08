"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Plus, Trash2, Edit, MessageSquare, Loader2, Check, Clock, DollarSign, MapPin,
  Calendar, Building2, AlertTriangle,
} from "lucide-react"
import { Intent } from "@/lib/supabase"

const MIN_EXAMPLES_RECOMMENDED = 3

const CLINIC_INTENT_TEMPLATES = [
  {
    intent_name: "Business Hours",
    example_user_phrases: [
      "What are your business hours?",
      "When are you open?",
      "What time do you close?",
      "Do you work on weekends?",
      "Are you open today?",
    ],
    english_responses: [
      "Our clinic is open Monday through Friday from 9 AM to 6 PM, and Saturdays from 9 AM to 1 PM. We're closed on Sundays.",
    ],
    icon: Clock,
  },
  {
    intent_name: "Pricing",
    example_user_phrases: [
      "How much does it cost?",
      "What are your rates?",
      "Do you take insurance?",
      "How much is a consultation?",
      "What's the price for [service]?",
    ],
    english_responses: [
      "Our pricing varies by service. For specific rates, please call or visit us. We accept most major insurance plans.",
    ],
    icon: DollarSign,
  },
  {
    intent_name: "Location",
    example_user_phrases: [
      "Where are you located?",
      "What's your address?",
      "How do I get there?",
      "Is there parking?",
      "Are you near [landmark]?",
    ],
    english_responses: [
      "We're located at [Your Address]. We have parking available in front of the building.",
    ],
    icon: MapPin,
  },
  {
    intent_name: "Appointment Booking",
    example_user_phrases: [
      "I'd like to book an appointment",
      "Can I schedule a visit?",
      "I need to see a doctor",
      "When is the next available slot?",
      "How do I make an appointment?",
    ],
    english_responses: [
      "To book an appointment, you can call us during business hours or use our online booking system. Would you like me to check availability?",
    ],
    icon: Calendar,
  },
  {
    intent_name: "Company Name",
    example_user_phrases: [
      "What's your clinic called?",
      "What's the name of this practice?",
      "Who am I speaking with?",
    ],
    english_responses: [
      "You've reached [Your Clinic Name]. How can I help you today?",
    ],
    icon: Building2,
  },
] as const

export default function IntentsPage() {
  const [intents, setIntents] = useState<Intent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentIntent, setCurrentIntent] = useState({
    id: "",
    intent_name: "",
    example_user_phrases: [""],
    english_responses: [""],
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [addingTemplateIds, setAddingTemplateIds] = useState<Set<string>>(new Set())
  const [isAddingAll, setIsAddingAll] = useState(false)

  const addedIntentNames = new Set(intents.map((i) => i.intent_name))
  const templatesToShow = CLINIC_INTENT_TEMPLATES.filter(
    (t) => !addedIntentNames.has(t.intent_name)
  )
  const hasAllTemplates = templatesToShow.length === 0

  useEffect(() => {
    fetchIntents()
  }, [])

  const fetchIntents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/intents')
      if (!response.ok) {
        throw new Error('Failed to fetch intents')
      }
      const data = await response.json()
      setIntents(data.intents || [])
    } catch (error) {
      console.error('Error fetching intents:', error)
      toast({
        title: "Error",
        description: "Failed to load intents. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddExample = () => {
    setCurrentIntent({
      ...currentIntent,
      example_user_phrases: [...currentIntent.example_user_phrases, ""],
    })
  }

  const handleAddResponseEn = () => {
    setCurrentIntent({
      ...currentIntent,
      english_responses: [...currentIntent.english_responses, ""],
    })
  }

  const handleExampleChange = (index: number, value: string) => {
    const newExamples = [...currentIntent.example_user_phrases]
    newExamples[index] = value
    setCurrentIntent({ ...currentIntent, example_user_phrases: newExamples })
  }

  const handleResponseEnChange = (index: number, value: string) => {
    const newResponses = [...currentIntent.english_responses]
    newResponses[index] = value
    setCurrentIntent({ ...currentIntent, english_responses: newResponses })
  }

  const handleRemoveExample = (index: number) => {
    const newExamples = [...currentIntent.example_user_phrases]
    newExamples.splice(index, 1)
    setCurrentIntent({ ...currentIntent, example_user_phrases: newExamples })
  }

  const handleRemoveResponseEn = (index: number) => {
    const newResponses = [...currentIntent.english_responses]
    newResponses.splice(index, 1)
    setCurrentIntent({ ...currentIntent, english_responses: newResponses })
  }

  const handleNewIntent = () => {
    setCurrentIntent({ id: "", intent_name: "", example_user_phrases: [""], english_responses: [""] })
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  const handleEditIntent = (intent: Intent) => {
    setCurrentIntent({
      id: intent.id,
      intent_name: intent.intent_name,
      example_user_phrases: intent.example_user_phrases,
      english_responses: intent.english_responses,
    })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleDeleteIntent = async (id: string) => {
    try {
      const response = await fetch(`/api/intents/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete intent')
      setIntents(intents.filter((intent) => intent.id !== id))
      toast({ title: "Intent deleted", description: "The intent has been removed successfully." })
    } catch (error) {
      console.error('Error deleting intent:', error)
      toast({ title: "Error", description: "Failed to delete intent. Please try again.", variant: "destructive" })
    }
  }

  const handleAddTemplate = async (
    template: (typeof CLINIC_INTENT_TEMPLATES)[number],
    options?: { silent?: boolean }
  ) => {
    setAddingTemplateIds((prev) => new Set(prev).add(template.intent_name))
    try {
      const response = await fetch("/api/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent_name: template.intent_name,
          example_user_phrases: template.example_user_phrases,
          english_responses: template.english_responses,
          russian_responses: [],
        }),
      })
      if (!response.ok) throw new Error("Failed to create intent")
      const { intent } = await response.json()
      setIntents((prev) => [intent, ...prev])
      if (!options?.silent) {
        toast({
          title: "Intent added",
          description: `${template.intent_name} has been added. Customize the placeholder text (e.g. [Your Address]) in your intents.`,
        })
      }
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to add intent. Please try again.", variant: "destructive" })
    } finally {
      setAddingTemplateIds((prev) => {
        const next = new Set(prev)
        next.delete(template.intent_name)
        return next
      })
    }
  }

  const handleAddAllTemplates = async () => {
    setIsAddingAll(true)
    for (const template of templatesToShow) {
      await handleAddTemplate(template, { silent: true })
    }
    setIsAddingAll(false)
    toast({
      title: "All templates added",
      description: "Edit each intent to add your clinic's specific details (address, hours, etc.).",
    })
  }

  const handleSaveIntent = async () => {
    setIsSaving(true)
    try {
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/intents/${currentIntent.id}` : '/api/intents'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent_name: currentIntent.intent_name,
          example_user_phrases: currentIntent.example_user_phrases.filter(p => p.trim() !== ''),
          english_responses: currentIntent.english_responses.filter(r => r.trim() !== ''),
          russian_responses: [],
        }),
      })
      if (!response.ok) throw new Error('Failed to save intent')
      const savedIntent = await response.json()
      if (isEditing) {
        setIntents(intents.map((intent) => (intent.id === currentIntent.id ? savedIntent.intent : intent)))
        toast({ title: "Intent updated", description: "The intent has been updated successfully." })
      } else {
        setIntents([savedIntent.intent, ...intents])
        toast({ title: "Intent created", description: "The new intent has been created successfully." })
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error saving intent:', error)
      toast({ title: "Error", description: "Failed to save intent. Please try again.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading intents...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Intent Manager</h1>
          <p className="text-muted-foreground">Create and manage conversation intents for your AI assistant</p>
        </div>
        <Button onClick={handleNewIntent} className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
          <Plus className="mr-2 h-4 w-4" />
          Add Intent
        </Button>
      </div>

      {/* ── Suggested intents ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-1">Suggested intents for a clinic</h3>
          <p className="text-sm text-muted-foreground mb-4">
            One-click add to get started. Each template includes multiple example phrases — customize placeholders like [Your Address] after adding.
          </p>
          <div className="flex flex-wrap gap-2">
            {CLINIC_INTENT_TEMPLATES.map((template) => {
              const Icon = template.icon
              const isAdded = addedIntentNames.has(template.intent_name)
              const isAdding = addingTemplateIds.has(template.intent_name)
              return (
                <Button
                  key={template.intent_name}
                  variant={isAdded ? "secondary" : "outline"}
                  size="sm"
                  className="h-9 gap-2"
                  onClick={() => !isAdded && handleAddTemplate(template)}
                  disabled={isAdded || isAdding}
                >
                  {isAdded ? (
                    <><Check className="h-4 w-4 text-lime-600" />{template.intent_name}</>
                  ) : isAdding ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Adding...</>
                  ) : (
                    <><Icon className="h-4 w-4" />{template.intent_name}</>
                  )}
                </Button>
              )
            })}
          </div>
          {!hasAllTemplates && templatesToShow.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-muted-foreground hover:text-foreground"
              onClick={handleAddAllTemplates}
              disabled={isAddingAll}
            >
              {isAddingAll ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding all...</>
              ) : (
                `Add all ${templatesToShow.length} remaining`
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Intent list ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {intents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No intents yet</h3>
              <p className="text-sm text-muted-foreground text-center mt-2 mb-4 max-w-sm">
                Add the suggested intents above with one click, or create a custom intent.
              </p>
              <Button onClick={handleNewIntent} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create Custom Intent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {intents.map((intent) => (
              <Card key={intent.id} className="overflow-hidden">
                <AccordionItem value={intent.id} className="border-none">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{intent.intent_name}</span>
                      <Badge variant="outline">
                        {intent.example_user_phrases.length} examples
                      </Badge>
                      {intent.example_user_phrases.length < MIN_EXAMPLES_RECOMMENDED && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Add more examples
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0 pb-4 px-6">
                      {intent.example_user_phrases.length < MIN_EXAMPLES_RECOMMENDED && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Not enough examples</AlertTitle>
                          <AlertDescription>
                            This intent has only {intent.example_user_phrases.length} example phrase{intent.example_user_phrases.length === 1 ? "" : "s"}. Add at least {MIN_EXAMPLES_RECOMMENDED} so your assistant can recognize more ways callers might ask.
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Example Phrases</h4>
                          <ul className="space-y-1 text-sm">
                            {intent.example_user_phrases.map((example, index) => (
                              <li key={index} className="text-muted-foreground">• {example}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Expected Response</h4>
                          <ul className="space-y-1 text-sm">
                            {intent.english_responses.map((response, index) => (
                              <li key={index} className="text-muted-foreground">• {response}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2 px-6 pb-4">
                      <Button variant="outline" size="sm" onClick={() => handleDeleteIntent(intent.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleEditIntent(intent)}
                        className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </CardFooter>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            ))}
          </Accordion>
        )}
      </div>

      {/* ── Create / Edit intent dialog ───────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Intent" : "Create New Intent"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modify this intent to change how your assistant responds to specific questions."
                : "Create a new intent to teach your assistant how to respond to specific questions."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="intent-name">Intent Name</Label>
              <Input
                id="intent-name"
                value={currentIntent.intent_name}
                onChange={(e) => setCurrentIntent({ ...currentIntent, intent_name: e.target.value })}
                placeholder="e.g., Business Hours, Location, Pricing"
              />
            </div>

            <Tabs defaultValue="examples" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="examples">Example Phrases</TabsTrigger>
                <TabsTrigger value="responses-en">Expected Response</TabsTrigger>
              </TabsList>

              <TabsContent value="examples" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Example User Phrases</Label>
                    <Button variant="outline" size="sm" onClick={handleAddExample}>
                      <Plus className="h-4 w-4 mr-1" /> Add Example
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Add examples of how users might ask about this topic</p>
                  {currentIntent.example_user_phrases.map((example, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={example}
                        onChange={(e) => handleExampleChange(index, e.target.value)}
                        placeholder="e.g., What are your business hours?"
                      />
                      {currentIntent.example_user_phrases.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveExample(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="responses-en" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Expected Response</Label>
                    <Button variant="outline" size="sm" onClick={handleAddResponseEn}>
                      <Plus className="h-4 w-4 mr-1" /> Add Response
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Add responses that your assistant will use</p>
                  {currentIntent.english_responses.map((response, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Textarea
                        value={response}
                        onChange={(e) => handleResponseEnChange(index, e.target.value)}
                        placeholder="e.g., Our business hours are Monday to Friday from 9 AM to 6 PM."
                        className="min-h-[100px]"
                      />
                      {currentIntent.english_responses.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveResponseEn(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveIntent}
              disabled={!currentIntent.intent_name || isSaving}
              className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isSaving ? "Saving..." : isEditing ? "Update Intent" : "Create Intent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
