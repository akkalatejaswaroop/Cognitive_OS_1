import { Bell, User } from "lucide-react";

export function Navbar() {
  return (
    <header className="h-16 border-b border-white/10 glass-panel flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium text-white/50">Workspace / <span className="text-white">Alpha-1</span></div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-white/60 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border border-black" />
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center border border-white/20">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  );
}
