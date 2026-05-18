"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cpu, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 w-full max-w-md"
      >
        <div className="glass-panel p-8 rounded-2xl border border-white/10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 mb-4">
              <Cpu className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Initialize Agent</h1>
            <p className="text-white/50 text-sm mt-1">Register for Cognitive OS access</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Agent ID (Email)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                placeholder="new.agent@cogni.os"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Secure Passcode</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Initialize"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-white/50">
            Entity already registered? <Link href="/login" className="text-purple-400 hover:text-purple-300">Access Terminal</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
