"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Bell, Search, User, Zap, Menu,
  ChevronDown, LogOut, 
  Briefcase, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebarStore } from "@/store/useSidebarStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

import { useAuth } from "@/contexts/AuthContext";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

const dropdownVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.15, ease: "easeOut" as const } },
  exit: { opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.1, ease: "easeIn" as const } },
};

export function Navbar() {
  const { toggleMobileSidebar } = useSidebarStore();
  const { signOut } = useAuth();
  // Use the backend user (authStore) for display — it has real profile data
  const { user: backendUser } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useClickOutside(profileRef, () => setIsProfileOpen(false));

  const handleLogout = async () => {
    await signOut();
  };

  // Prefer backend user data (which has avatar_url from our DB)
  const displayName =
    backendUser?.full_name ||
    backendUser?.name ||
    "User";
  const userInitials = displayName.slice(0, 2).toUpperCase();
  // Backend stores avatar_url as path like /static/avatars/... or full URL
  const apiBase = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:8000";
  const rawAvatar = backendUser?.avatar_url;
  const avatarUrl = rawAvatar
    ? rawAvatar.startsWith("http")
      ? rawAvatar
      : `${apiBase}${rawAvatar}`
    : null;

  return (
    <header className="h-16 border-b border-border glass-panel flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 transition-theme">
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">

        {/* Mobile hamburger */}
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Workspace indicator — shows real data, no demo names */}
        <div className="relative hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-muted/30 flex-shrink-0">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
            <Briefcase className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            No workspace
          </span>
          <Link
            href="/dashboard"
            className="ml-1 flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            title="Create a workspace"
          >
            <Plus className="w-3.5 h-3.5" />
            Create
          </Link>
        </div>

        {/* Global search */}
        <div className="relative w-full max-w-md hidden md:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-muted/40 border border-border rounded-full py-2 pl-10 pr-16 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 hover:bg-muted/80 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/50 bg-muted/50 border border-border rounded">⌘K</kbd>
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        {/* Mobile search button */}
        <button className="md:hidden p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Search className="w-5 h-5" />
        </button>

        {/* AI status */}
        <div
          title="Engine Connected"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 cursor-default"
        >
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary">Connected</span>
          <div className="w-2 h-2 rounded-full bg-primary glow-dot" />
        </div>

        {/* Theme toggle */}
        <ThemeToggle className="flex" />

        {/* Notifications */}
        <button className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-background glow-dot" />
        </button>

        <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

        {/* User profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-1.5 hover:bg-muted p-1 pr-2 rounded-full transition-colors border border-transparent hover:border-border cursor-pointer"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover border border-primary/20 flex-shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary font-mono">
                {userInitials}
              </div>
            )}
            <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground/60 hidden sm:block transition-transform duration-200", isProfileOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute top-full mt-2 right-0 w-64 rounded-xl border border-border glass-panel shadow-2xl py-2 z-50"
              >
                <div className="px-4 py-3 border-b border-border mb-1">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground/60 truncate">{backendUser?.email || ""}</p>
                </div>

                <div className="px-1 space-y-0.5">
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    <User className="w-4 h-4 text-muted-foreground/60" />
                    Profile & Preferences
                  </Link>
                </div>

                <div className="border-t border-border mt-1 pt-1 px-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
