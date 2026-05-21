"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Cpu, 
  Lock, 
  ArrowRight, 
  Loader2, 
  Check, 
  X, 
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react"
import Link from "next/link"
import { auth } from "@/utils/firebase/config"
import { confirmPasswordReset } from "firebase/auth"

// 1. Validation Schema
const resetPasswordSchema = z.object({
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

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const oobCode = searchParams.get('oobCode')
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  // 2. React Hook Form Setup
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
    defaultValues: {
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
  const onSubmit = async (data: ResetPasswordValues) => {
    setIsLoading(true)
    setSubmitError(null)
    
    try {
      if (!oobCode) {
        throw new Error("Invalid or missing password reset code.")
      }
      
      await confirmPasswordReset(auth, oobCode, data.password)

      setIsSuccess(true)
      successTimerRef.current = setTimeout(() => {
        router.push("/login?message=Password reset successfully. Sign in with your new credentials.")
      }, 3000)

    } catch (err: unknown) {
      setSubmitError((err as Error).message || "An unexpected error occurred. Please try again.")
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
        {/* Main Glass Card */}
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
              Reset Password
            </h1>
            <p className="text-muted-foreground text-sm mt-2 text-center leading-relaxed">
              Define your new credentials to authorize session overrides.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.form 
                key="reset-form"
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

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>New Password</span>
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

                {/* Confirm Password Field */}
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
                      <span>Commit Password Override</span>
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
                    Password Updated
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Credentials updated successfully. Mounting redirect to sign-in terminal...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-medium tracking-wide animate-pulse">Initializing security module...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </React.Suspense>
  )
}
