"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Cpu, 
  Mail, 
  Lock, 
  User, 
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
const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const { signUp, signInWithGoogle } = useAuth()
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  // 2. React Hook Form Setup
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  })

  const passwordValue = watch("password", "")

  // 3. Password Strength Checker Calculations
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: "Weak", color: "bg-muted" }
    
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    switch (score) {
      case 1:
      case 2:
        return { score, text: "Weak", color: "bg-red-500 shadow-red-500/20" }
      case 3:
        return { score, text: "Fair", color: "bg-amber-500 shadow-amber-500/20" }
      case 4:
        return { score, text: "Strong", color: "bg-emerald-500 shadow-emerald-500/20" }
      case 5:
        return { score, text: "Excellent", color: "bg-cyan-500 shadow-cyan-500/20 animate-pulse" }
      default:
        return { score: 0, text: "Weak", color: "bg-muted" }
    }
  }

  const pwdStrength = getPasswordStrength(passwordValue)

  // 4. Form Submission Handler
  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true)
    setSubmitError(null)
    
    try {
      const { error } = await signUp(data.email, data.password)

      if (error) {
        throw new Error(error.message)
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.push("/login?message=Check your email to confirm your account")
      }, 3000)

    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    setSubmitError(null)
    
    try {
      const { error } = await signInWithGoogle()

      if (error) {
        throw new Error(error.message)
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)

    } catch (err: any) {
      setSubmitError(err.message || "Google sign up failed.")
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
        {/* Main Sign Up Glass Card */}
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
              Access Cognitive OS
            </h1>
            <p className="text-muted-foreground text-sm mt-2 text-center leading-relaxed">
              Create an account to deploy autonomous agent environments.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.form 
                key="signup-form"
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

                {/* 1. Full Name Field */}
                <div className="space-y-1.5">
                  <label htmlFor="fullName" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Full Name</span>
                  </label>
                  <div className="relative">
                    <input
                      id="fullName"
                      type="text"
                      placeholder="Alan Turing"
                      {...register("fullName")}
                      className={`w-full bg-muted/30 border ${errors.fullName ? 'border-destructive' : 'border-border/60'} rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 ${errors.fullName ? 'focus:ring-destructive/20 focus:border-destructive' : 'focus:ring-primary/20 focus:border-primary/50'} transition-all`}
                      aria-invalid={!!errors.fullName}
                      aria-describedby={errors.fullName ? "fullName-error" : undefined}
                    />
                  </div>
                  {errors.fullName && (
                    <span id="fullName-error" className="text-[11px] text-destructive flex items-center gap-1">
                      <X className="w-3 h-3" /> {errors.fullName.message}
                    </span>
                  )}
                </div>

                {/* 2. Email Field */}
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

                {/* 3. Password Field */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Password</span>
                  </label>
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

                  {/* Password Strength Indicator */}
                  {passwordValue && (
                    <div className="pt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Strength:</span>
                        <span className="text-foreground">{pwdStrength.text}</span>
                      </div>
                      <div className="flex gap-1.5 h-1.5 w-full">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div 
                            key={level} 
                            className={`flex-1 rounded-full h-full transition-all duration-300 ${
                              level <= pwdStrength.score ? pwdStrength.color : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {errors.password && (
                    <span id="password-error" className="text-[11px] text-destructive flex items-center gap-1">
                      <X className="w-3 h-3" /> {errors.password.message}
                    </span>
                  )}
                </div>

                {/* 4. Confirm Password Field */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirm Password</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("confirmPassword")}
                      className={`w-full bg-muted/30 border ${errors.confirmPassword ? 'border-destructive' : 'border-border/60'} rounded-2xl pl-4 pr-11 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 ${errors.confirmPassword ? 'focus:ring-destructive/20 focus:border-destructive' : 'focus:ring-primary/20 focus:border-primary/50'} transition-all`}
                      aria-invalid={!!errors.confirmPassword}
                      aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
                      aria-label={showConfirmPassword ? "Hide password verification" : "Show password verification"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <span id="confirmPassword-error" className="text-[11px] text-destructive flex items-center gap-1">
                      <X className="w-3 h-3" /> {errors.confirmPassword.message}
                    </span>
                  )}
                </div>

                {/* Terms of Service Check */}
                <p className="text-[10px] text-muted-foreground leading-normal text-center pt-1 font-light">
                  By clicking Sign Up, you agree to the standard{" "}
                  <Link href="/terms" className="text-primary hover:underline underline-offset-2">Terms of Service</Link> and{" "}
                  <Link href="/privacy" className="text-primary hover:underline underline-offset-2">Privacy Policy</Link>.
                </p>

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
                      <span>Provision Workspace</span>
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
                    Environment Created
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Check your email inbox to verify your credentials security key and activate your system dashboard access.
                  </p>
                </div>
                
                <p className="text-[11px] text-muted-foreground/60 animate-pulse pt-4">
                  Redirecting to identity verify portal...
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
                  onClick={handleGoogleSignUp}
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
            Already have an account?{" "}
            <Link 
              href="/login" 
              className="text-primary hover:text-primary/85 font-semibold underline underline-offset-4 duration-300"
            >
              Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
