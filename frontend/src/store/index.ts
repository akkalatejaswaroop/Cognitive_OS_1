import { create } from 'zustand';

interface AgentStatus {
  id: string;
  name: string;
  status: "idle" | "executing";
  task: string;
  color: string;
}

interface ChatState {
  messages: Array<{ id: string; role: 'user' | 'agent' | 'system'; content: string }>;
  agents: AgentStatus[];
  addMessage: (msg: { id: string; role: 'user' | 'agent' | 'system'; content: string }) => void;
  updateMessage: (id: string, content: string) => void;
  updateAgentStatus: (name: string, status: "idle" | "executing", task: string) => void;
  resetAllAgents: () => void;
}

const initialAgents: AgentStatus[] = [
  { id: "supervisor", name: "Supervisor", status: "idle", task: "Awaiting task delegation", color: "text-purple-400" },
  { id: "coder-agent", name: "Coder-Agent", status: "idle", task: "Waiting for supervisor", color: "text-blue-400" },
  { id: "research-agent", name: "Research-Agent", status: "idle", task: "Waiting for supervisor", color: "text-emerald-400" },
];

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    { id: 'init', role: 'system', content: 'Cognitive OS Initialized. Waiting for commands...' }
  ],
  agents: initialAgents,
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateMessage: (id, content) => set((state) => ({
    messages: state.messages.map((m) => m.id === id ? { ...m, content } : m)
  })),
  updateAgentStatus: (name, status, task) => set((state) => {
    // Normalize names to match initial list (e.g. "supervisor" or "coder-agent")
    const targetName = name.toLowerCase().replace(/_/g, '-');
    return {
      agents: state.agents.map((agent) => {
        if (agent.id === targetName || agent.name.toLowerCase() === targetName) {
          return { ...agent, status, task };
        }
        // If supervisor is executing a task, keep other agents idle. If another agent is executing, supervisor is idle or delegating
        return agent;
      })
    };
  }),
  resetAllAgents: () => set(() => ({ agents: initialAgents })),
}));
