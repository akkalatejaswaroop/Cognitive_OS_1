"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

/**
 * A client-side wrapper to protect interactive features or dynamic client segments.
 */
export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login?error=Please sign in to view this section")
      } else if (allowedRoles && allowedRoles.length > 0) {
        // Use the role field on our AuthUser type
        const userRole = user.role || "user"
        if (!allowedRoles.includes(userRole)) {
          router.push("/dashboard?error=Access denied. Higher authority clearance required.")
        }
      }
    }
  }, [user, isLoading, allowedRoles, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-semibold tracking-wide animate-pulse">Verifying credentials...</p>
        </div>
      </div>
    )
  }

  // Prevent rendering children if session does not exist or lacks rights
  if (!user) return null

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role || "user"
    if (!allowedRoles.includes(userRole)) {
      return null
    }
  }

  return <>{children}</>
}
