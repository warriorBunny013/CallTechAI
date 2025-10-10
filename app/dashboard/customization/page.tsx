"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { TimePickerDemo } from "@/components/time-picker"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Save, Play } from "lucide-react"

export default function CustomizationPage() {
  const [botName, setBotName] = useState("CallTechAI Assistant")
  const [language, setLanguage] = useState("multilang")
  const [englishGreeting, setEnglishGreeting] = useState(
    "Hello! This is CallTechAI Assistant. How can I help you today?",
  )
  const [russianGreeting, setRussianGreeting] = useState(
    "Здравствуйте! Это CallTechAI Assistant. Чем я могу вам помочь сегодня?",
  )
  const [englishFallback, setEnglishFallback] = useState(
    "I'm sorry, I didn't understand that. Could you please rephrase?",
  )
  const [russianFallback, setRussianFallback] = useState("Извините, я не понял. Не могли бы вы перефразировать?")
  const [voice, setVoice] = useState("female1")
  const [isActive, setIsActive] = useState(true)
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Audio elements for voice preview
  const sophiaAudioRef = useRef<HTMLAudioElement | null>(null)
  const elenaAudioRef = useRef<HTMLAudioElement | null>(null)
  const michaelAudioRef = useRef<HTMLAudioElement | null>(null)

  const handlePlayVoice = (voiceType: string) => {
    // In a real implementation, these would be actual audio files
    if (voiceType === "female1" && sophiaAudioRef.current) {
      sophiaAudioRef.current.play()
    } else if (voiceType === "female2" && elenaAudioRef.current) {
      elenaAudioRef.current.play()
    } else if (voiceType === "male1" && michaelAudioRef.current) {
      michaelAudioRef.current.play()
    }

    // For now, just show a toast
    toast({
      title: "Voice Preview",
      description: `Playing ${
        voiceType === "female1" ? "Sophia" : voiceType === "female2" ? "Elena" : "Michael"
      } voice sample.`,
    })
  }

  const handleSave = () => {
    setIsSaving(true)

    // Simulate saving data
    setTimeout(() => {
      console.log({
        botName,
        language,
        englishGreeting,
        russianGreeting,
        englishFallback,
        russianFallback,
        voice,
        isActive,
        workingHoursEnabled,
      })

      setIsSaving(false)
      toast({
        title: "Settings saved",
        description: "Your assistant configuration has been updated successfully.",
      })
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Customization</h1>
        <p className="text-muted-foreground">Configure how your AI voice assistant sounds and responds to callers.</p>
      </div>

      <Tabs defaultValue="main" className="space-y-4">
        <TabsList>
          <TabsTrigger value="main">Main Settings</TabsTrigger>
          <TabsTrigger value="voice">Voice & Language</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="schedule">Working Hours</TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Set up the basic details for your AI assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bot-name">Assistant Name</Label>
                <Input
                  id="bot-name"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Enter your assistant's name"
                />
                <p className="text-sm text-muted-foreground">
                  This name will be used when your assistant introduces itself to callers.
                </p>
              </div>

              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="assistant-active-toggle">Assistant Status</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="assistant-active-toggle" checked={isActive} onCheckedChange={setIsActive} />
                  <Label htmlFor="assistant-active-toggle">
                    {isActive
                      ? "Active - Your assistant is answering calls"
                      : "Inactive - Your assistant is not answering calls"}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">Toggle this switch to enable or disable your assistant.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voice Settings</CardTitle>
              <CardDescription>Choose how your assistant sounds to callers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Voice Type</Label>
                <RadioGroup value={voice} onValueChange={setVoice} className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female1" id="female1" />
                    <Label htmlFor="female1" className="flex items-center">
                      <span>Sophia [Female]</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 text-xs"
                        onClick={() => handlePlayVoice("female1")}
                      >
                        <Play className="mr-1 h-3 w-3" /> Preview
                      </Button>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female2" id="female2" />
                    <Label htmlFor="female2" className="flex items-center">
                      <span>Elena [Female]</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 text-xs"
                        onClick={() => handlePlayVoice("female2")}
                      >
                        <Play className="mr-1 h-3 w-3" /> Preview
                      </Button>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male1" id="male1" />
                    <Label htmlFor="male1" className="flex items-center">
                      <span>Michael [Male]</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 text-xs"
                        onClick={() => handlePlayVoice("male1")}
                      >
                        <Play className="mr-1 h-3 w-3" /> Preview
                      </Button>
                    </Label>
                  </div>
                </RadioGroup>

                {/* Hidden audio elements for voice preview */}
                <audio ref={sophiaAudioRef} src="/audio/sophia-sample.mp3" />
                <audio ref={elenaAudioRef} src="/audio/elena-sample.mp3" />
                <audio ref={michaelAudioRef} src="/audio/michael-sample.mp3" />
              </div>

              <div className="space-y-2 pt-4">
                <Label>Language Support</Label>
                <RadioGroup value={language} onValueChange={setLanguage} className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="english" id="english" />
                    <Label htmlFor="english">English Only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="russian" id="russian" />
                    <Label htmlFor="russian">Russian Only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multilang" id="multilang" />
                    <Label htmlFor="multilang">Multilingual (English & Russian)</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Greeting Messages</CardTitle>
              <CardDescription>Customize how your assistant greets callers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="english-greeting">English Greeting</Label>
                <Textarea
                  id="english-greeting"
                  value={englishGreeting}
                  onChange={(e) => setEnglishGreeting(e.target.value)}
                  placeholder="Enter greeting in English"
                  disabled={language === "russian"}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="russian-greeting">Russian Greeting</Label>
                <Textarea
                  id="russian-greeting"
                  value={russianGreeting}
                  onChange={(e) => setRussianGreeting(e.target.value)}
                  placeholder="Enter greeting in Russian"
                  disabled={language === "english"}
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fallback Responses</CardTitle>
              <CardDescription>Messages used when your assistant doesn't understand a request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="english-fallback">English Fallback</Label>
                <Textarea
                  id="english-fallback"
                  value={englishFallback}
                  onChange={(e) => setEnglishFallback(e.target.value)}
                  placeholder="Enter fallback message in English"
                  disabled={language === "russian"}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="russian-fallback">Russian Fallback</Label>
                <Textarea
                  id="russian-fallback"
                  value={russianFallback}
                  onChange={(e) => setRussianFallback(e.target.value)}
                  placeholder="Enter fallback message in Russian"
                  disabled={language === "english"}
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Working Hours</CardTitle>
              <CardDescription>Define when your assistant is active</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="working-hours-enabled"
                    checked={workingHoursEnabled}
                    onCheckedChange={setWorkingHoursEnabled}
                  />
                  <Label htmlFor="working-hours-enabled">Enable working hours</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  When enabled, your assistant will only answer calls during the specified hours.
                </p>
              </div>

              {workingHoursEnabled && (
                <div className="space-y-4 pt-4">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <div key={day} className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-center">
                      <div className="flex items-center space-x-2">
                        <Switch id={`day-${day}`} defaultChecked={day !== "Sunday"} />
                        <Label htmlFor={`day-${day}`}>{day}</Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${day}-start`}>Start Time</Label>
                        <TimePickerDemo />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${day}-end`}>End Time</Label>
                        <TimePickerDemo />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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