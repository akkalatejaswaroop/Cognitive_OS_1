import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto p-6 relative">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
          {children}
        </main>
      </div>
    </div>
  );
}
