"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import {
  Check, Play, Calendar, MessageSquare, Bot, BarChart3, Globe, ArrowRight,
  PhoneCall, Zap, BrainCircuit, TrendingUp, Menu, X, Sparkles, Clock, Star,
  Pause, Volume2, VolumeX, Maximize2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut } from "lucide-react"

export default function LandingPage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isYearly, setIsYearly] = useState(true)
  const router = useRouter()

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(false)
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null)

  const MONTHLY_PRICES = { starter: 99, growth: 249, pro: 599 }
  const DISCOUNT = 0.4
  const yearlyPrice = (monthly: number) => Math.round(monthly * (1 - DISCOUNT))

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user ?? null)
        setAuthLoading(false)
      })
      .catch(() => setAuthLoading(false))
  }, [])

  // Auto-play video when it enters the viewport
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().then(() => setIsPlaying(true)).catch(() => {})
          } else {
            video.pause()
            setIsPlaying(false)
          }
        })
      },
      { threshold: 0.3 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {})
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const handleFullscreen = () => {
    const video = videoRef.current
    if (!video) return
    if (video.requestFullscreen) video.requestFullscreen()
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 2500)
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    router.push("/")
    router.refresh()
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        
        * {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .font-mono {
          font-family: 'Space Mono', monospace;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-slideUp {
          animation: slideUp 0.6s ease-out forwards;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }

        .video-container:hover .video-overlay-gradient {
          opacity: 1;
        }

        .video-controls-fade {
          transition: opacity 0.3s ease;
        }
      `}</style>
    <div className="flex min-h-screen flex-col bg-[#0A0A0A] text-white overflow-x-hidden">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="container flex h-20 items-center justify-between px-6 md:px-8 max-w-[1400px] mx-auto">
          <Link href="/" className="flex items-center gap-1 group">
            <Image
              src="/Calltechai-logo-svg.svg"
              alt="CallTechAI Logo"
              width={54}
              height={54}
              className="shrink-0 group-hover:scale-105 transition-transform duration-300"
            />
            <span className="text-xl font-bold">
              CallTech<span className="text-[#84CC16]">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            {[
              { label: "Features", href: "#features" },
              { label: "How it Works", href: "#live-in-minutes" },
              { label: "Pricing", href: "#pricing" },
              { label: "FAQ", href: "#faq" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-white/60 hover:text-white transition-colors relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#84CC16] group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {!authLoading && !user && (
              <>
                <Button variant="ghost" size="sm" className="hidden md:inline-flex text-white/80 hover:text-white hover:bg-white/5" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-semibold px-6 h-10 rounded-full shadow-lg shadow-lime-500/20 hover:shadow-lime-500/40 transition-all duration-300"
                  asChild
                >
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )}
            {!authLoading && user && (
              <>
                <Button size="sm" className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-semibold rounded-full" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hidden md:inline-flex hover:bg-white/5">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-[#84CC16]/20 text-[#84CC16] text-sm font-bold">
                          {(user.email?.[0] ?? "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-white/10">
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-white/80 hover:text-white">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-white/5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-black/95 backdrop-blur-2xl px-6 py-6">
            {[
              { label: "Features", href: "#features" },
              { label: "How it Works", href: "#live-in-minutes" },
              { label: "Pricing", href: "#pricing" },
              { label: "FAQ", href: "#faq" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="block py-3 text-sm font-medium text-white/70 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {!authLoading && !user && (
              <Link
                href="/login"
                className="block py-3 text-sm font-medium text-white/70 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 pt-20">
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="relative w-full px-4 pt-16 pb-10 md:pt-40 md:pb-18 overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-[#84CC16]/20 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '4s'}} />
            <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{animationDuration: '6s', animationDelay: '1s'}} />
            <div className="absolute bottom-0 left-1/2 w-[400px] h-[400px] md:w-[700px] md:h-[700px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '5s', animationDelay: '2s'}} />
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:72px_72px]" />
          </div>

          <div className="container max-w-[1200px] mx-auto">
            <div className="flex flex-col items-center text-center space-y-7 md:space-y-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm animate-slideUp">
                <div className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse" />
                <span className="text-xs md:text-sm font-medium text-white/90">Early access open</span>
              </div>

              {/* Headline */}
              <div className="space-y-4 md:space-y-6 max-w-[900px] animate-slideUp" style={{animationDelay: '0.1s'}}>
                <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1]">
                  Your AI receptionist.
                  <br />
                  <span className="bg-gradient-to-r from-[#84CC16] via-[#A3E635] to-[#84CC16] bg-clip-text text-transparent animate-gradient">
                    Always available.
                  </span>
                </h1>
                <p className="text-base md:text-xl text-white/60 max-w-[600px] mx-auto leading-relaxed font-medium px-2">
                  AI voice assistant that answers calls 24/7, handles customer inquiries, and sounds completely human.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2 md:pt-6 w-full sm:w-auto animate-slideUp" style={{animationDelay: '0.2s'}}>
                {!authLoading && !user && (
                  <Button
                    size="lg"
                    className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold px-8 md:px-10 h-12 md:h-14 text-base md:text-lg rounded-full shadow-[0_0_40px_rgba(132,204,22,0.4)] hover:shadow-[0_0_60px_rgba(132,204,22,0.6)] transition-all duration-500 group w-full sm:w-auto"
                    asChild
                  >
                    <Link href="/signup">
                      Start free trial
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                )}
                {!authLoading && user && (
                  <Button
                    size="lg"
                    className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold px-8 md:px-10 h-12 md:h-14 text-base md:text-lg rounded-full shadow-[0_0_40px_rgba(132,204,22,0.4)] transition-all duration-500 w-full sm:w-auto"
                    asChild
                  >
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/20 hover:bg-white/5 text-white font-semibold px-8 md:px-10 h-12 md:h-14 text-base md:text-lg rounded-full backdrop-blur-sm transition-all duration-300 w-full sm:w-auto"
                  asChild
                >
                  <Link href="https://calendly.com/igorkholin89/30min?month=2026-03">
                    <Play className="mr-2 h-5 w-5" />
                    Watch Demo
                  </Link>
                </Button>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 pt-4 md:pt-8 text-xs md:text-sm text-white/50 animate-slideUp" style={{animationDelay: '0.3s'}}>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#84CC16] flex-shrink-0" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#84CC16] flex-shrink-0" />
                  <span>Setup in 2 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#84CC16] fill-[#84CC16] flex-shrink-0" />
                  <span>7-day free trial</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── DEMO VIDEO ──────────────────────────────────────────────────── */}
        <section className="w-full py-10 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[900px] h-[400px] md:h-[500px] bg-[#84CC16]/10 rounded-full blur-[120px]" />
          </div>

          <div className="container max-w-[1100px] mx-auto px-4 md:px-8">
            <div className="flex items-center justify-center mb-6 md:mb-10">
              <div className="flex items-center gap-3 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-white/5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse" />
                <span className="text-xs md:text-sm font-semibold text-white/70 tracking-wide font-mono uppercase">See it in action</span>
              </div>
            </div>

            {/* Video player wrapper */}
            <div
              className="video-container relative group rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(132,204,22,0.12)] bg-black cursor-pointer"
              style={{ aspectRatio: '16/9' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setShowControls(false)}
              onClick={togglePlay}
            >
              <video
                ref={videoRef}
                src="calltechai-demo-version1.mov"
                className="w-full h-full object-cover"
                muted
                playsInline
                loop
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Gradient overlay on hover */}
              <div className="video-overlay-gradient absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 transition-opacity duration-300 pointer-events-none" />

              {/* Center play/pause button — shown when paused or on hover */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
                  !isPlaying || showControls ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all duration-300 ${
                  isPlaying ? 'bg-black/40 scale-90' : 'bg-[#84CC16]/90 scale-100 shadow-[0_0_40px_rgba(132,204,22,0.5)]'
                }`}>
                  {isPlaying
                    ? <Pause className="w-8 h-8 text-white" />
                    : <Play className="w-8 h-8 text-black ml-1" />
                  }
                </div>
              </div>

              {/* Bottom controls bar */}
              <div
                className={`video-controls-fade absolute bottom-0 left-0 right-0 px-6 py-5 flex items-center justify-between pointer-events-none ${
                  showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left: play + mute */}
                <div className="flex items-center gap-3 pointer-events-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay() }}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying
                      ? <Pause className="w-4 h-4 text-white" />
                      : <Play className="w-4 h-4 text-white ml-0.5" />
                    }
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMute() }}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted
                      ? <VolumeX className="w-4 h-4 text-white" />
                      : <Volume2 className="w-4 h-4 text-white" />
                    }
                  </button>
                  <span className="text-xs text-white/60 font-mono hidden sm:block">
                    {isMuted ? 'Click to unmute' : 'Sound on'}
                  </span>
                </div>

                {/* Right: label + fullscreen */}
                <div className="flex items-center gap-3 pointer-events-auto">
                  <span className="text-xs font-bold text-white/50 font-mono hidden sm:block tracking-wide">CALLTECHAI DEMO</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleFullscreen() }}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
                    aria-label="Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* "Muted — click to unmute" initial nudge badge */}
              {isPlaying && isMuted && (
                <div
                  className="absolute top-5 right-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 cursor-pointer pointer-events-auto animate-in fade-in duration-500"
                  onClick={(e) => { e.stopPropagation(); toggleMute() }}
                >
                  <VolumeX className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-xs text-white/70 font-medium">Tap to unmute</span>
                </div>
              )}
            </div>

            {/* Caption below video */}
            <p className="text-center text-xs md:text-sm text-white/40 mt-4 md:mt-6 font-mono tracking-wide px-2">
              WATCH HOW CALLTECHAI HANDLES REAL CUSTOMER CALLS IN UNDER 2 MINUTES
            </p>
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────────────── */}
        <section id="features" className="w-full py-16 md:py-40 relative">
          <div className="container px-4 md:px-8 max-w-[1400px] mx-auto">
            <div className="text-center mb-12 md:mb-20">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
                Everything you need.
                <br />
                <span className="text-white/40">Nothing you don't.</span>
              </h2>
              <p className="text-base md:text-xl text-white/50 max-w-[600px] mx-auto">
                Powerful features that make customer service effortless
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[
                {
                  icon: <Bot className="h-6 w-6 md:h-7 md:w-7" />,
                  title: "Human-like conversations",
                  description: "Premium AI voices with natural intonation. Customers can't tell the difference.",
                  available: true,
                },
                {
                  icon: <Globe className="h-6 w-6 md:h-7 md:w-7" />,
                  title: "Multilingual",
                  description: "English & Russian today. More languages shipping soon.",
                  available: true,
                },
                {
                  icon: <BarChart3 className="h-6 w-6 md:h-7 md:w-7" />,
                  title: "Analytics",
                  description: "Every call recorded. AI summaries. Performance tracking.",
                  available: true,
                },
                {
                  icon: <BrainCircuit className="h-6 w-6 md:h-7 md:w-7" />,
                  title: "Knowledge base",
                  description: "Your business info, FAQs, services. AI knows it all.",
                  available: true,
                },
                {
                  icon: <Calendar className="h-6 w-6 md:h-7 md:w-7" />,
                  title: "Calendar booking",
                  description: "Google Calendar integration. Automated scheduling.",
                  available: true,
                },
                {
                  icon: <MessageSquare className="h-6 w-6 md:h-7 md:w-7" />,
                  title: "Instant alerts",
                  description: "WhatsApp & Telegram notifications in real-time.",
                  available: true,
                },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="group relative p-6 md:p-8 rounded-2xl md:rounded-3xl border transition-all duration-500 bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#84CC16]/50 hover:shadow-[0_0_40px_rgba(132,204,22,0.15)]"
                >
                  <div className="inline-flex p-3 md:p-4 rounded-xl md:rounded-2xl mb-4 md:mb-6 transition-all duration-500 bg-[#84CC16]/10 text-[#84CC16] group-hover:scale-110 group-hover:rotate-3">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm md:text-base leading-relaxed text-white/60">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
        <section id="live-in-minutes" className="w-full py-16 md:py-40 relative overflow-hidden">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[300px] h-[600px] bg-[#84CC16]/10 blur-[150px]" />
          
          <div className="container px-4 md:px-8 max-w-[1000px] mx-auto relative">
            <div className="text-center mb-12 md:mb-20">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
                Live in minutes
              </h2>
              <p className="text-base md:text-xl text-white/50 max-w-[600px] mx-auto">
                Five steps from signup to your first AI-answered call
              </p>
            </div>

            <div className="space-y-4 md:space-y-8">
              {[
                {
                  num: "01",
                  title: "Start your free trial",
                  desc: "No credit card. Instant access. Explore everything.",
                },
                {
                  num: "02",
                  title: "Get your number",
                  desc: "Local number assigned. Ready to receive calls immediately.",
                },
                {
                  num: "03",
                  title: "Build knowledge base",
                  desc: "Add hours, services, pricing, FAQs. This powers your AI.",
                },
                {
                  num: "04",
                  title: "Pick your voice",
                  desc: "Choose from premium AI personas. Match your brand perfectly.",
                },
                {
                  num: "05",
                  title: "Monitor & optimize",
                  desc: "Review recordings, track analytics, get alerts, and continuously improve.",
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="group relative flex gap-4 md:gap-8 p-5 md:p-8 rounded-2xl md:rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#84CC16]/50 transition-all duration-500"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#84CC16] to-[#65A30D] flex items-center justify-center shadow-lg shadow-lime-500/25 group-hover:shadow-lime-500/50 group-hover:scale-110 transition-all duration-500">
                      <span className="text-base md:text-2xl font-bold text-black font-mono">{step.num}</span>
                    </div>
                  </div>
                  <div className="flex-1 pt-1 md:pt-2">
                    <h3 className="text-lg md:text-2xl font-bold text-white mb-1 md:mb-2 group-hover:text-[#84CC16] transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="text-sm md:text-lg text-white/60 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                  {idx < 4 && (
                    <div className="absolute left-[2.4rem] md:left-[4.5rem] top-[4.5rem] md:top-[6rem] w-0.5 h-8 md:h-12 bg-white/10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ────────────────────────────────────────────────────── */}
        <section id="pricing" className="w-full py-16 md:py-40">
          <div className="container px-4 md:px-8 max-w-[1300px] mx-auto">
            <div className="text-center mb-10 md:mb-16">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
                Simple pricing
              </h2>
              <p className="text-base md:text-xl text-white/50 max-w-[600px] mx-auto mb-8 md:mb-10">
                Pick the plan that fits your call volume. Upgrade anytime.
              </p>

              <div className="flex items-center justify-center gap-4">
                <span className={`text-sm font-semibold transition-colors ${!isYearly ? 'text-white' : 'text-white/40'}`}>Monthly</span>
                <button
                  onClick={() => setIsYearly(!isYearly)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${isYearly ? 'bg-[#84CC16]' : 'bg-white/20'}`}
                  aria-label="Toggle billing period"
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${isYearly ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
                <span className={`text-sm font-semibold transition-colors ${isYearly ? 'text-white' : 'text-white/40'}`}>Yearly</span>
                {isYearly && (
                  <span className="px-3 py-1 rounded-full bg-[#84CC16] text-black text-xs font-bold animate-in fade-in duration-300">40% OFF</span>
                )}
              </div>
              {isYearly && (
                <p className="text-xs md:text-sm text-white/40 mt-3 font-mono animate-in fade-in duration-300">BILLED ANNUALLY · EARLY BIRD PRICING</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
              {/* Starter */}
              <div className="relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 transition-all duration-500 group flex flex-col">
                <div className="mb-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-bold font-mono tracking-wide mb-4">SOLO</span>
                  <h3 className="text-2xl font-bold text-white mb-1">Starter</h3>
                  <p className="text-white/50 text-sm mb-6">Freelancers · solo trades · consultants</p>
                </div>
                <div className="mb-6">
                  {isYearly ? (
                    <>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-lg text-white/30 line-through font-semibold">${MONTHLY_PRICES.starter}</span>
                        <span className="text-5xl font-bold text-white">${yearlyPrice(MONTHLY_PRICES.starter)}</span>
                        <span className="text-lg text-white/50">/mo</span>
                      </div>
                      <p className="text-sm font-bold text-[#84CC16]">40% Early Bird Offer · billed yearly</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1.5 mb-1">
                        <span className="text-5xl font-bold text-white">${MONTHLY_PRICES.starter}</span>
                        <span className="text-lg text-white/50">/mo</span>
                      </div>
                      <p className="text-sm font-semibold text-white/50">billed monthly</p>
                    </>
                  )}
                  <p className="text-sm text-white/50 mt-1">250 min included</p>
                </div>
                <div className="mb-6 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <p className="text-xs font-bold text-white/40 font-mono mb-0.5">60–120 CALLS/MONTH</p>
                  <p className="text-sm text-white/60">Perfect for handling up to 100 customer calls/month</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {["1 AI receptionist number","1 voice persona","1 language (English)","WhatsApp or Telegram alerts","Google Calendar sync","Call recordings + AI summaries","Analytics dashboard","Custom intents (FAQs, hours, pricing)","Email support"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#84CC16] flex-shrink-0 mt-0.5" />
                      <span className="text-white/70 text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white font-bold h-12 rounded-full transition-all duration-300 border border-white/20" asChild>
                  <Link href="/signup">Start free trial</Link>
                </Button>
              </div>

              {/* Growth */}
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border-2 border-[#84CC16] shadow-[0_0_60px_rgba(132,204,22,0.2)] overflow-hidden group flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-[#84CC16]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-[#84CC16] text-black text-xs font-bold font-mono">MOST POPULAR</div>
                <div className="relative mb-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#84CC16]/20 text-[#84CC16] text-xs font-bold font-mono tracking-wide mb-4">BUSINESS</span>
                  <h3 className="text-2xl font-bold text-white mb-1">Growth</h3>
                  <p className="text-white/50 text-sm mb-6">Salons · clinics · agencies · SMBs</p>
                </div>
                <div className="relative mb-6">
                  {isYearly ? (
                    <>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-lg text-white/30 line-through font-semibold">${MONTHLY_PRICES.growth}</span>
                        <span className="text-5xl font-bold text-white">${yearlyPrice(MONTHLY_PRICES.growth)}</span>
                        <span className="text-lg text-white/50">/mo</span>
                      </div>
                      <p className="text-sm font-bold text-[#84CC16]">40% Early Bird Offer · billed yearly</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1.5 mb-1">
                        <span className="text-5xl font-bold text-white">${MONTHLY_PRICES.growth}</span>
                        <span className="text-lg text-white/50">/mo</span>
                      </div>
                      <p className="text-sm font-semibold text-white/50">billed monthly</p>
                    </>
                  )}
                  <p className="text-sm text-[#84CC16] font-semibold mt-1">500 min included</p>
                </div>
                <div className="relative mb-6 rounded-xl bg-[#84CC16]/10 border border-[#84CC16]/30 px-4 py-3">
                  <p className="text-xs font-bold text-[#84CC16]/60 font-mono mb-0.5">~150–250 CALLS/MONTH</p>
                  <p className="text-sm text-white/70">Ideal for busy clinics & salons with daily bookings</p>
                </div>
                <ul className="relative space-y-3 mb-8 flex-1">
                  {["3 AI receptionist numbers","3 voice personas","English + Russian","WhatsApp + Telegram alerts","Google Calendar sync","Call recordings + AI summaries","Advanced analytics + trends","Unlimited custom intents","Priority chat support"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#84CC16] flex-shrink-0 mt-0.5" />
                      <span className="text-white/80 text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="relative w-full bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold h-12 rounded-full shadow-lg shadow-lime-500/25 hover:shadow-lime-500/40 transition-all duration-300" asChild>
                  <Link href="/signup">Start free trial</Link>
                </Button>
              </div>

              {/* Pro */}
              <div className="relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 transition-all duration-500 group flex flex-col">
                <div className="mb-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold font-mono tracking-wide mb-4">BUSINESS+</span>
                  <h3 className="text-2xl font-bold text-white mb-1">Pro</h3>
                  <p className="text-white/50 text-sm mb-6">Multi-location · high-volume · restaurants</p>
                </div>
                <div className="mb-6">
                  {isYearly ? (
                    <>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-lg text-white/30 line-through font-semibold">${MONTHLY_PRICES.pro}</span>
                        <span className="text-5xl font-bold text-white">${yearlyPrice(MONTHLY_PRICES.pro)}</span>
                        <span className="text-lg text-white/50">/mo</span>
                      </div>
                      <p className="text-sm font-bold text-[#84CC16]">40% Early Bird Offer · billed yearly</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1.5 mb-1">
                        <span className="text-5xl font-bold text-white">${MONTHLY_PRICES.pro}</span>
                        <span className="text-lg text-white/50">/mo</span>
                      </div>
                      <p className="text-sm font-semibold text-white/50">billed monthly</p>
                    </>
                  )}
                  <p className="text-sm text-purple-300 font-semibold mt-1">1,000 min included</p>
                </div>
                <div className="mb-6 rounded-xl bg-purple-500/10 border border-purple-500/20 px-4 py-3">
                  <p className="text-xs font-bold text-purple-300/60 font-mono mb-0.5">300–500 CALLS/MONTH</p>
                  <p className="text-sm text-white/60">Built for high-volume businesses & multi-location teams</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {["10 AI receptionist numbers","10 voice personas","All languages supported","WhatsApp + Telegram alerts","Google Calendar sync","Call recordings + AI summaries","Full analytics suite","Unlimited custom intents","Priority phone + chat support"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                      <span className="text-white/70 text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white font-bold h-12 rounded-full transition-all duration-300 border border-white/20" asChild>
                  <Link href="/signup">Start free trial</Link>
                </Button>
              </div>
            </div>

            {/* Custom Plan */}
            <div className="relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 transition-all duration-500 group">
              <div className="flex flex-col md:flex-row md:items-center gap-8">
                <div className="flex-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-bold font-mono tracking-wide mb-4">ENTERPRISE</span>
                  <h3 className="text-2xl font-bold text-white mb-1">Custom</h3>
                  <p className="text-white/50 text-sm mb-4">For agencies, franchises & multi-location businesses with unique needs.</p>
                  <div className="flex flex-wrap gap-3">
                    {["Custom numbers & AI assistants","Custom minutes","Custom integrations","VIP support (1-4h SLA)","Dedicated onboarding","White-label options"].map((f) => (
                      <span key={f} className="flex items-center gap-1.5 text-sm text-white/60">
                        <Check className="w-3.5 h-3.5 text-[#84CC16] flex-shrink-0" />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                  <div className="text-4xl font-bold text-white">Custom pricing</div>
                  <p className="text-white/40 text-sm">Tailored to your volume & requirements</p>
                  <Button className="bg-white hover:bg-white/90 text-black font-bold h-12 px-8 rounded-full transition-all duration-300" asChild>
                    <a href="https://calendly.com/igorkholin89/30min?month=2026-03">Book a demo</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section id="faq" className="w-full py-16 md:py-40">
          <div className="container px-4 md:px-8 max-w-[900px] mx-auto">
            <div className="text-center mb-12 md:mb-20">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">Questions?</h2>
              <p className="text-base md:text-xl text-white/50">Everything you need to know</p>
            </div>
            <Accordion type="single" collapsible className="space-y-3 md:space-y-4">
              {[
                { q: "How does CallTechAI work?", a: "You get a dedicated phone number. When customers call, our AI answers instantly 24/7. It understands questions and responds based on your business info. Every call is logged, recorded, and summarized." },
                { q: "Will customers know it's AI?", a: "Most won't notice. Our premium voices sound natural with no robotic tones. You pick the personality that fits your brand." },
                { q: "Can I customize responses?", a: "Absolutely. Choose your AI voice, then add your business info, services, FAQs, hours—everything. The AI uses this to answer perfectly every time." },
                { q: "What languages work?", a: "English and Russian today. More languages coming very soon." },
                { q: "How fast is setup?", a: "About 2 minutes. Sign up, get your number, add business info, pick your voice, done. No technical skills needed." },
                { q: "Any contracts?", a: "No contracts. Cancel anytime. You keep access until your billing period ends. 7-day free trial, no credit card required." },
              ].map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border border-white/10 rounded-2xl px-4 md:px-6 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                  <AccordionTrigger className="text-left font-bold text-white hover:text-[#84CC16] py-5 md:py-6 hover:no-underline text-base md:text-lg">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 leading-relaxed pb-5 md:pb-6 text-sm md:text-base">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <section className="w-full py-16 md:py-40 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#84CC16]/20 via-transparent to-blue-500/10" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:72px_72px]" />
          <div className="container px-4 md:px-8 max-w-[1000px] mx-auto relative">
            <div className="text-center space-y-6 md:space-y-10">
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
                Ready to answer<br />
                <span className="text-[#84CC16]">every call?</span>
              </h2>
              <p className="text-base md:text-2xl text-white/60 max-w-[700px] mx-auto leading-relaxed px-2">
                Join businesses using AI to handle customer calls perfectly. Start your free trial today.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-2 md:pt-6">
                {!authLoading && !user && (
                  <Button size="lg" className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold px-8 md:px-12 h-14 md:h-16 text-base md:text-lg rounded-full shadow-[0_0_40px_rgba(132,204,22,0.4)] hover:shadow-[0_0_60px_rgba(132,204,22,0.6)] transition-all duration-500 group" asChild>
                    <Link href="/signup">Start free trial <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /></Link>
                  </Button>
                )}
                {!authLoading && user && (
                  <Button size="lg" className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold px-8 md:px-12 h-14 md:h-16 text-base md:text-lg rounded-full shadow-[0_0_40px_rgba(132,204,22,0.4)] transition-all duration-500" asChild>
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                )}
                <Button size="lg" variant="outline" className="border-2 border-white/20 hover:bg-white/5 text-white font-semibold px-8 md:px-12 h-14 md:h-16 text-base md:text-lg rounded-full backdrop-blur-sm transition-all duration-300" asChild>
                  <a href="mailto:infocalltechai@gmail.com">Contact us</a>
                </Button>
              </div>
              <p className="text-xs md:text-sm text-white/40 font-mono">NO CREDIT CARD • 7-DAY FREE TRIAL • CANCEL ANYTIME</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-white/10 bg-black/40 backdrop-blur-2xl py-12 md:py-16">
        <div className="container px-4 md:px-8 max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-10 md:mb-12">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <Link href="/" className="flex items-center gap-3 group">
                <Image src="/Calltechai-logo-svg.svg" alt="CallTechAI Logo" width={38} height={38} className="shrink-0" />
                <span className="text-lg font-bold">CallTech<span className="text-[#84CC16]">AI</span></span>
              </Link>
              <p className="text-sm text-white/50 leading-relaxed">AI-powered voice reception. Never sleep. Never miss a call.</p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Product</h3>
              <ul className="space-y-3">
                {["Features", "Pricing", "FAQ"].map((item) => (
                  <li key={item}><Link href={`#${item.toLowerCase()}`} className="text-sm text-white/60 hover:text-white transition-colors">{item}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Company</h3>
              <ul className="space-y-3">
                <li><a href="mailto:infocalltechai@gmail.com" className="text-sm text-white/60 hover:text-white transition-colors">Contact</a></li>
                <li><Link href="/terms" className="text-sm text-white/60 hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="text-sm text-white/60 hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Contact</h3>
              <ul className="space-y-3">
                <li><a href="tel:+15304990632" className="text-sm text-white/60 hover:text-white transition-colors">+1 (530) 499-0632</a></li>
                <li><a href="mailto:infocalltechai@gmail.com" className="text-sm text-white/60 hover:text-white transition-colors break-all">infocalltechai@gmail.com</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10">
            <p className="text-sm text-white/40 text-center font-mono">© 2026 CallTechAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
    </>
  )
}