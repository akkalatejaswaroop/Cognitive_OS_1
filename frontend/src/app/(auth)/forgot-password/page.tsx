"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Cpu, 
  Mail, 
  ArrowRight, 
  Loader2, 
  Check, 
  X, 
  Sparkles,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { auth } from "@/utils/firebase/config"
import { sendPasswordResetEmail } from "firebase/auth"

// 1. Validation Schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address")
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 2. React Hook Form Setup
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  })

  // 3. Form Submission Handler
  const onSubmit = async (data: ForgotPasswordValues) => {
    setIsLoading(true)
    setSubmitError(null)
    
    try {
      await sendPasswordResetEmail(auth, data.email, {
        url: `${window.location.origin}/login`,
      })

      setIsSuccess(true)

    } catch (err: any) {
      setSubmitError(err.message || "Unable to send recovery instructions. Please try again.")
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
              Restore System
            </h1>
            <p className="text-muted-foreground text-sm mt-2 text-center leading-relaxed">
              Enter your email address to receive password override instructions.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.form 
                key="forgot-form"
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

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Registered Email</span>
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 mt-6 bg-gradient-to-tr from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95 text-primary-foreground rounded-2xl font-semibold text-sm transition-all duration-300 shadow-xl shadow-primary/25 hover:shadow-2xl flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Transmit Recovery Token</span>
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
                    Recovery Dispatched
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Check your email inbox. If the address matches an active Cognitive OS profile, you will receive link override parameters.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 text-center text-xs text-muted-foreground border-t border-border/30 pt-6">
            <Link 
              href="/login" 
              className="text-muted-foreground hover:text-foreground font-semibold inline-flex items-center gap-2 duration-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
