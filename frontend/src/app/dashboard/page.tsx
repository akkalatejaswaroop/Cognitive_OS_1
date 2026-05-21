"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LayoutDashboard, Sparkles, Loader2, Pencil, Trash2, X, Check, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";

interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

function CreateWorkspaceModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) { setError("Please enter a workspace name"); return; }
    setLoading(true);
    try {
      await onCreate(name.trim());
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">New Workspace</h2>
            <p className="text-sm text-muted-foreground mt-1">Workspaces are where you deploy agents and manage tasks.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Workspace Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Marketing Hub, Research Lab…"
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WorkspaceCard({
  workspace,
  onRename,
  onDelete,
}: {
  workspace: Workspace;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(workspace.name);
  const [loading, setLoading] = useState(false);

  const saveRename = async () => {
    if (!editName.trim() || editName === workspace.name) { setEditing(false); return; }
    setLoading(true);
    try {
      await onRename(workspace.id, editName.trim());
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) return;
    setLoading(true);
    await onDelete(workspace.id);
  };

  const createdDate = new Date(workspace.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
    >
      {/* Colour accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 rounded-t-2xl group-hover:bg-primary/40 transition-colors" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setEditing(false); }}
                className="flex-1 bg-muted/50 border border-primary/30 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <button onClick={saveRename} disabled={loading} className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button onClick={() => setEditing(false)} className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <h3 className="font-bold text-lg truncate">{workspace.name}</h3>
          )}
          <p className="text-xs text-muted-foreground mt-1">Created {createdDate}</p>
        </div>

        {!editing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-primary/20">
          Active
        </span>
        <span className="text-xs text-muted-foreground">0 agents · 0 tasks</span>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await apiClient("/api/v1/workspaces") as Response;
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
      }
    } catch (e) {
      console.error("Failed to fetch workspaces", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreate = async (name: string) => {
    const res = await apiClient("/api/v1/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    }) as Response;
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to create workspace");
    }
    await fetchWorkspaces();
  };

  const handleRename = async (id: string, name: string) => {
    const res = await apiClient(`/api/v1/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }) as Response;
    if (!res.ok) throw new Error("Failed to rename workspace");
    await fetchWorkspaces();
  };

  const handleDelete = async (id: string) => {
    await apiClient(`/api/v1/workspaces/${id}`, { method: "DELETE" });
    setWorkspaces((prev) => prev.filter((ws) => ws.id !== id));
  };

  if (!mounted) return null;

  return (
    <>
      <div className="space-y-8 pb-16 transition-all duration-300 font-sans max-w-5xl mx-auto">

        {/* ── SECTION 1: EDITORIAL WELCOME HERO ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 md:p-10 shadow-sm"
        >
          <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />
          <div className="absolute -right-16 -top-16 w-96 h-96 bg-primary/5 dark:bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-mono tracking-wider uppercase text-primary font-bold">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                System Core v1.0.4
              </div>

              <h1 className="text-3xl md:text-5xl font-display font-medium tracking-tight text-foreground">
                Welcome,{" "}
                <span className="font-serif italic font-semibold text-foreground">
                  {user?.name || user?.full_name || "User"}
                </span>
              </h1>

              <p className="text-sm md:text-base text-muted-foreground max-w-2xl font-light leading-relaxed">
                {workspaces.length === 0
                  ? "Create your first workspace to start deploying cognitive agents and automating tasks."
                  : `You have ${workspaces.length} workspace${workspaces.length > 1 ? "s" : ""} active. Deploy agents, manage memory, and automate tasks.`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── WORKSPACES SECTION ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              Your Workspaces
            </h2>
            {workspaces.length > 0 && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
              >
                <Plus className="w-4 h-4" /> New Workspace
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
          ) : workspaces.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col items-center justify-center p-16 bg-card border border-border border-dashed rounded-3xl text-center shadow-sm"
            >
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 border border-primary/20">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No Workspaces Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed font-light">
                A workspace is where you deploy agents, manage databases, and automate tasks. Create one to get started.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-primary/20"
              >
                <Plus className="w-4 h-4" /> Create First Workspace
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  workspace={ws}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateWorkspaceModal
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
          />
        )}
      </AnimatePresence>
    </>
  );
}
