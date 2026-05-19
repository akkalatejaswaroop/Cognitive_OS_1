"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";
import { Cpu, Loader2, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Google Auth specific states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleStep, setGoogleStep] = useState<"select" | "custom">("select");

  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await apiClient("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Signup failed");
      }

      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (googleEmail: string) => {
    setIsGoogleLoading(true);
    setError("");
    try {
      const res = await apiClient("/api/v1/auth/google", {
        method: "POST",
        body: JSON.stringify({
          email: googleEmail,
          name: googleEmail.split("@")[0],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Google Sign-Up failed");
      }

      setUser(data.user);
      setShowGoogleModal(false);
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setShowGoogleModal(false);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const googleAccounts = [
    { email: "tejas.designer@cognitive.ai", role: "Product Designer" },
    { email: "developer.core@cognitive.ai", role: "Systems Engineer" },
    { email: "guest.sandbox@cognitive.ai", role: "Simulated Guest Session" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-grid font-sans selection:bg-primary/20 selection:text-foreground">
      {/* Background Graphic Accents */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] opacity-40 dark:opacity-20 animate-float" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 w-full max-w-md px-6"
      >
        <div className="border border-border/60 bg-card rounded-2xl p-8 shadow-[0_4px_30px_rgba(0,0,0,0.01)] hover:shadow-xl duration-300 relative overflow-hidden">
          <div className="flex flex-col items-center mb-8">
            <Link href="/" className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-4 hover:scale-105 duration-300">
              <Cpu className="w-6 h-6 text-primary" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">Create Account</h1>
            <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
              Create an isolated workspace credentials profile
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted/20 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="email@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-muted/20 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 mt-4 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 duration-300 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign Up</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
              <span className="bg-card px-3 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Google Sign Up Button */}
          <button
            type="button"
            disabled={isLoading || isGoogleLoading}
            onClick={() => {
              setGoogleStep("select");
              setShowGoogleModal(true);
            }}
            className="w-full py-3 border border-border rounded-xl font-medium hover:bg-muted/10 transition-colors flex items-center justify-center gap-3 text-xs text-foreground bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow duration-300 cursor-pointer"
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
            <span>Sign Up with Google</span>
          </button>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account? <Link href="/login" className="text-primary hover:text-primary/85 font-medium underline underline-offset-4 duration-300">Sign In</Link>
          </div>
        </div>
      </motion.div>

      {/* Google Accounts Selection Pop-up Modal */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isGoogleLoading) setShowGoogleModal(false);
              }}
              className="absolute inset-0 bg-background/85 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm border border-border bg-card rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
            >
              {/* Google Header Logo */}
              <div className="flex flex-col items-center mb-6">
                <svg className="w-8 h-8 mb-3" viewBox="0 0 24 24">
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
                <h2 className="text-base font-bold text-foreground">Sign up with Google</h2>
                <p className="text-[11px] text-muted-foreground mt-1">to register a Cognitive OS workspace</p>
              </div>

              {isGoogleLoading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground font-medium animate-pulse">Creating user space...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {googleStep === "select" ? (
                    <>
                      {/* Account selection list */}
                      <div className="space-y-2">
                        {googleAccounts.map((account) => (
                          <button
                            key={account.email}
                            onClick={() => handleGoogleLogin(account.email)}
                            className="w-full text-left p-3 rounded-xl hover:bg-muted/30 border border-transparent hover:border-border/60 transition-all flex items-center justify-between group duration-200 cursor-pointer"
                          >
                            <div>
                              <p className="text-xs font-semibold text-foreground">{account.email}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{account.role}</p>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary duration-300" />
                          </button>
                        ))}
                      </div>

                      {/* Custom account button */}
                      <button
                        onClick={() => setGoogleStep("custom")}
                        className="w-full text-center py-2.5 rounded-xl hover:bg-muted/15 border border-dashed border-border/80 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
                      >
                        Use custom Google account
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Google Email</label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            autoFocus
                            value={customGoogleEmail}
                            onChange={(e) => setCustomGoogleEmail(e.target.value)}
                            placeholder="username@gmail.com"
                            className="w-full bg-muted/20 border border-border/80 rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-colors"
                          />
                          <Mail className="absolute left-3 top-3 w-3.5 h-3.5 text-muted-foreground/45" />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setGoogleStep("select")}
                          className="flex-1 py-2 rounded-xl hover:bg-muted/20 border border-border text-[11px] font-semibold text-muted-foreground transition-colors duration-200 cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={!customGoogleEmail.includes("@")}
                          onClick={() => handleGoogleLogin(customGoogleEmail)}
                          className="flex-1 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-50 duration-200 cursor-pointer"
                        >
                          <span>Continue</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Privacy / Local Disclaimer */}
                  <div className="pt-4 border-t border-border/30 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[9px] text-muted-foreground leading-normal font-light">
                      Cognitive OS local-first environment registers standard Google accounts directly with database residency isolated entirely to your physical machine.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
