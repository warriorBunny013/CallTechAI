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
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Plus, Trash2, Edit, MessageSquare, Loader2 } from "lucide-react"
import { Intent } from "@/lib/supabase"

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

  // Fetch intents from API
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
    setCurrentIntent({
      ...currentIntent,
      example_user_phrases: newExamples,
    })
  }

  const handleResponseEnChange = (index: number, value: string) => {
    const newResponses = [...currentIntent.english_responses]
    newResponses[index] = value
    setCurrentIntent({
      ...currentIntent,
      english_responses: newResponses,
    })
  }

  const handleRemoveExample = (index: number) => {
    const newExamples = [...currentIntent.example_user_phrases]
    newExamples.splice(index, 1)
    setCurrentIntent({
      ...currentIntent,
      example_user_phrases: newExamples,
    })
  }

  const handleRemoveResponseEn = (index: number) => {
    const newResponses = [...currentIntent.english_responses]
    newResponses.splice(index, 1)
    setCurrentIntent({
      ...currentIntent,
      english_responses: newResponses,
    })
  }

  const handleNewIntent = () => {
    setCurrentIntent({
      id: "",
      intent_name: "",
      example_user_phrases: [""],
      english_responses: [""],
    })
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
      const response = await fetch(`/api/intents/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete intent')
      }

      setIntents(intents.filter((intent) => intent.id !== id))
      toast({
        title: "Intent deleted",
        description: "The intent has been removed successfully.",
      })
    } catch (error) {
      console.error('Error deleting intent:', error)
      toast({
        title: "Error",
        description: "Failed to delete intent. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSaveIntent = async () => {
    setIsSaving(true)

    try {
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/intents/${currentIntent.id}` : '/api/intents'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent_name: currentIntent.intent_name,
          example_user_phrases: currentIntent.example_user_phrases.filter(phrase => phrase.trim() !== ''),
          english_responses: currentIntent.english_responses.filter(response => response.trim() !== ''),
          russian_responses: [],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save intent')
      }

      const savedIntent = await response.json()

      if (isEditing) {
        setIntents(intents.map((intent) => (intent.id === currentIntent.id ? savedIntent.intent : intent)))
        toast({
          title: "Intent updated",
          description: "The intent has been updated successfully.",
        })
      } else {
        setIntents([savedIntent.intent, ...intents])
        toast({
          title: "Intent created",
          description: "The new intent has been created successfully.",
        })
      }

      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error saving intent:', error)
      toast({
        title: "Error",
        description: "Failed to save intent. Please try again.",
        variant: "destructive",
      })
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
        <div>
          <Button onClick={handleNewIntent} className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
            <Plus className="mr-2 h-4 w-4" />
            Add Intent
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {intents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No intents created yet</h3>
              <p className="text-sm text-muted-foreground text-center mt-2 mb-4">
                Create your first intent to teach your assistant how to respond to specific questions.
              </p>
              <Button onClick={handleNewIntent} className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                <Plus className="mr-2 h-4 w-4" />
                Create Intent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {intents.map((intent) => (
              <Card key={intent.id} className="overflow-hidden">
                <AccordionItem value={intent.id} className="border-none">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center">
                      <span className="font-medium">{intent.intent_name}</span>
                      <Badge variant="outline" className="ml-2">
                        {intent.example_user_phrases.length} examples
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0 pb-4 px-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Example Phrases</h4>
                          <ul className="space-y-1 text-sm">
                            {intent.example_user_phrases.map((example, index) => (
                              <li key={index} className="text-muted-foreground">
                                • {example}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Expected Response</h4>
                          <ul className="space-y-1 text-sm">
                            {intent.english_responses.map((response, index) => (
                              <li key={index} className="text-muted-foreground">
                                • {response}
                              </li>
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
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
