import { AIChatInterface } from "@/components/AIChatInterface";
import { MemoryPanel } from "@/components/MemoryPanel";
import { AgentActivity } from "@/components/AgentActivity";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-6 h-full pb-6">
      {/* Left Column - Chat/Supervisor */}
      <div className="col-span-12 lg:col-span-7 h-[calc(100vh-8rem)]">
        <AIChatInterface />
      </div>

      {/* Right Column - Context & Agents */}
      <div className="col-span-12 lg:col-span-5 h-[calc(100vh-8rem)] flex flex-col gap-6">
        <div className="h-1/2">
          <MemoryPanel />
        </div>
        <div className="h-1/2">
          <AgentActivity />
        </div>
      </div>
    </div>
  );
}
