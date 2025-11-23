"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Bot, CheckCircle2, Loader2, Filter } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { voiceAgents, getVoiceAgents, type VoiceAgent } from "@/lib/voice-agents"

export default function AssistantsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [languageFilter, setLanguageFilter] = useState<'all' | 'english' | 'multilingual' | 'spanish'>('all')
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'neutral'>('all')
  const [filteredAgents, setFilteredAgents] = useState<VoiceAgent[]>(voiceAgents)
  const [userIntents, setUserIntents] = useState<any[]>([])
  const [hasAssistant, setHasAssistant] = useState(false)

  useEffect(() => {
    fetchUserIntents()
    checkExistingAssistant()
  }, [])

  useEffect(() => {
    const filtered = getVoiceAgents({
      language: languageFilter,
      gender: genderFilter
    })
    setFilteredAgents(filtered)
  }, [languageFilter, genderFilter])

  const fetchUserIntents = async () => {
    try {
      const response = await fetch('/api/intents')
      if (response.ok) {
        const data = await response.json()
        setUserIntents(data.intents || [])
      }
    } catch (error) {
      console.error('Error fetching intents:', error)
    }
  }

  const checkExistingAssistant = async () => {
    try {
      const response = await fetch('/api/assistants')
      if (response.ok) {
        const data = await response.json()
        setHasAssistant((data.assistants || []).length > 0)
      }
    } catch (error) {
      console.error('Error checking assistant:', error)
    }
  }

  const handleCreateAssistant = async (agentId: string) => {
    if (userIntents.length === 0) {
      toast({
        title: "No Intents Found",
        description: "Please create at least one intent before creating an assistant.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreating(true)
      setSelectedAgent(agentId)

      const agent = getVoiceAgents().find(a => a.id === agentId)
      if (!agent) {
        throw new Error('Voice agent not found')
      }

      // Create assistant with selected voice agent and user's intents
      const response = await fetch('/api/create-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intentIds: userIntents.map(i => i.id),
          name: agent.name,
          voiceAgent: agent
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create assistant')
      }

      toast({
        title: "Success!",
        description: `Your assistant "${agent.name}" has been created successfully!`,
      })

      setHasAssistant(true)
      checkExistingAssistant()
    } catch (error: any) {
      console.error('Error creating assistant:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create assistant. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
      setSelectedAgent(null)
    }
  }

  const getLanguageBadgeColor = (language: string) => {
    switch (language) {
      case 'english':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'spanish':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
      case 'multilingual':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
    }
  }

  const getGenderBadgeColor = (gender: string) => {
    switch (gender) {
      case 'male':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100'
      case 'female':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100'
      case 'neutral':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voice Assistants</h1>
          <p className="text-muted-foreground mt-2">
            Choose a voice agent personality for your AI assistant
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Language</Label>
              <Select value={languageFilter} onValueChange={(value: any) => setLanguageFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="english">English Only</SelectItem>
                  <SelectItem value="spanish">Spanish Only</SelectItem>
                  <SelectItem value="multilingual">Multilingual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={genderFilter} onValueChange={(value: any) => setGenderFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      {userIntents.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> You need to create at least one intent before creating an assistant. 
              <a href="/dashboard/intents" className="underline ml-1">Go to Intents →</a>
            </p>
          </CardContent>
        </Card>
      )}

      {hasAssistant && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">
                You already have an assistant created. Creating a new one will replace your existing assistant.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Agents Grid */}
      {filteredAgents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No voice agents found</h3>
            <p className="text-muted-foreground text-center">
              Try adjusting your filters to see more options
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <Card
              key={agent.id}
              className={`transition-all hover:shadow-lg ${
                selectedAgent === agent.id ? 'ring-2 ring-rose-500' : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-rose-500" />
                      {agent.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {agent.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Personality</p>
                  <p className="text-sm text-muted-foreground">{agent.personality}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={getLanguageBadgeColor(agent.language)}>
                    {agent.language === 'english' ? 'English' :
                     agent.language === 'spanish' ? 'Spanish' :
                     'Multilingual'}
                  </Badge>
                  <Badge className={getGenderBadgeColor(agent.gender)}>
                    {agent.gender === 'male' ? 'Male' :
                     agent.gender === 'female' ? 'Female' :
                     'Neutral'}
                  </Badge>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">First Message:</p>
                  <p className="text-sm italic">"{agent.firstMessage}"</p>
                </div>

                <Button
                  onClick={() => handleCreateAssistant(agent.id)}
                  disabled={isCreating || userIntents.length === 0}
                  className="w-full bg-rose-500 hover:bg-rose-600"
                >
                  {isCreating && selectedAgent === agent.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Create Assistant
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredAgents.length}</div>
            <p className="text-xs text-muted-foreground">Available Agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{userIntents.length}</div>
            <p className="text-xs text-muted-foreground">Your Intents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{hasAssistant ? '1' : '0'}</div>
            <p className="text-xs text-muted-foreground">Active Assistant</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

