"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Cpu, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Sparkles
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

// 1. Validation Schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean()
})

type LoginFormValues = z.infer<typeof loginSchema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signInWithGoogle } = useAuth()
  
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  // Grab any message passed from signup page (e.g. email verification instructions)
  useEffect(() => {
    const msg = searchParams.get("message")
    if (msg) {
      setInfoMessage(msg)
    }
    const err = searchParams.get("error")
    if (err) {
      setSubmitError(err)
    }
  }, [searchParams])

  // 2. React Hook Form Setup
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false
    }
  })

  // 3. Form Submission Handler
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setSubmitError(null)
    setInfoMessage(null)
    
    try {
      const { error } = await signIn(data.email, data.password)

      if (error) {
        throw new Error(error.message)
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 2000)

    } catch (err: any) {
      setSubmitError(err.message || "Invalid email or password. Please verify your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setSubmitError(null)
    setInfoMessage(null)
    
    try {
      const { error } = await signInWithGoogle()

      if (error) {
        throw new Error(error.message)
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 2000)

    } catch (err: any) {
      setSubmitError(err.message || "Google sign in failed.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background font-sans selection:bg-primary/20 selection:text-foreground">
      {/* Background Futuristic Light Accents */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[160px] opacity-60 animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[160px] opacity-60 animate-float-delay" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--background)_100%)] opacity-80" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="z-10 w-full max-w-md px-6 my-8"
      >
        {/* Main Sign In Glass Card */}
        <div className="backdrop-blur-xl bg-card/45 border border-border/40 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          
          {/* Header Title Section */}
          <div className="flex flex-col items-center mb-8">
            <Link 
              href="/" 
              className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-violet-600 flex items-center justify-center border border-primary/20 mb-5 shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-300"
              aria-label="Cognitive OS Home"
            >
              <Cpu className="w-7 h-7 text-primary-foreground" />
            </Link>
            
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-display bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Access Workspace
            </h1>
            <p className="text-muted-foreground text-sm mt-2 text-center leading-relaxed">
              Login to access your active agents and associative memory logs.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.form 
                key="login-form"
                onSubmit={handleSubmit(onSubmit)} 
                className="space-y-5"
                noValidate
              >
                {/* Submit Error Display */}
                {submitError && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5"
                  >
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </motion.div>
                )}

                {/* Info Message Display (from signup page) */}
                {infoMessage && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs flex items-start gap-2.5"
                  >
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{infoMessage}</span>
                  </motion.div>
                )}

                {/* 1. Email Field */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Address</span>
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      placeholder="turing@cognitive.ai"
                      {...register("email")}
                      className={`w-full bg-muted/30 border ${errors.email ? 'border-destructive' : 'border-border/60'} rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 ${errors.email ? 'focus:ring-destructive/20 focus:border-destructive' : 'focus:ring-primary/20 focus:border-primary/50'} transition-all`}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                  </div>
                  {errors.email && (
                    <span id="email-error" className="text-[11px] text-destructive flex items-center gap-1">
                      <X className="w-3 h-3" /> {errors.email.message}
                    </span>
                  )}
                </div>

                {/* 2. Password Field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Password</span>
                    </label>
                    <Link 
                      href="/forgot-password" 
                      className="text-[11px] text-primary hover:underline hover:text-primary/80 duration-300 font-semibold"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("password")}
                      className={`w-full bg-muted/30 border ${errors.password ? 'border-destructive' : 'border-border/60'} rounded-2xl pl-4 pr-11 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 ${errors.password ? 'focus:ring-destructive/20 focus:border-destructive' : 'focus:ring-primary/20 focus:border-primary/50'} transition-all`}
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? "password-error" : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <span id="password-error" className="text-[11px] text-destructive flex items-center gap-1">
                      <X className="w-3 h-3" /> {errors.password.message}
                    </span>
                  )}
                </div>

                {/* Remember Me Option */}
                <div className="flex items-center space-x-2.5 pt-1">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    {...register("rememberMe")}
                    className="w-4 h-4 rounded-md border-border bg-muted/30 text-primary focus:ring-primary/20 focus:ring-offset-background cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="text-xs font-medium text-muted-foreground cursor-pointer select-none">
                    Remember this device for 30 days
                  </label>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 mt-6 bg-gradient-to-tr from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95 text-primary-foreground rounded-2xl font-semibold text-sm transition-all duration-300 shadow-xl shadow-primary/25 hover:shadow-2xl flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Secure Authorization</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              // Success Screen Animation
              <motion.div 
                key="success-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center relative">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                  >
                    <Check className="w-10 h-10 text-cyan-400" />
                  </motion.div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-full border border-cyan-400/20"
                  />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground flex items-center justify-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    Workspace Authorized
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Identity verified. Initializing secure neural context engine and loading workspaces...
                  </p>
                </div>
                
                <p className="text-[11px] text-muted-foreground/60 animate-pulse pt-4">
                  Mounting cognitive console...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Social Divider */}
          {!isSuccess && (
            <>
              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/40" />
                </div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                  <span className="bg-transparent backdrop-blur-xl px-4 text-muted-foreground">Or Connect Identity</span>
                </div>
              </div>

              {/* Social Login Button Group */}
              <div className="flex justify-center gap-3.5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full max-w-[200px] py-3 border border-border/60 hover:border-border rounded-2xl hover:bg-muted/15 transition-all flex items-center justify-center gap-2.5 text-xs font-semibold text-foreground duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>
              </div>
            </>
          )}

          <div className="mt-8 text-center text-xs text-muted-foreground border-t border-border/30 pt-6">
            Don't have an account?{" "}
            <Link 
              href="/signup" 
              className="text-primary hover:text-primary/85 font-semibold underline underline-offset-4 duration-300"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-medium tracking-wide animate-pulse">Initializing security module...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </React.Suspense>
  )
}
