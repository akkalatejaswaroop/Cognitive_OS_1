import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { DashboardContentWrapper } from "@/components/DashboardContentWrapper";

import { requireAuth } from "@/utils/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth()

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-theme">
      {/* Ambient background gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/5 dark:bg-secondary/8 rounded-full blur-[120px]" />
      </div>

      <Sidebar />

      <DashboardContentWrapper>
        <Navbar />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 relative custom-scrollbar">
          <div className="max-w-[1600px] 2xl:max-w-[1800px] mx-auto h-full relative z-10 w-full">
            {children}
          </div>
        </main>
      </DashboardContentWrapper>
    </div>
  );
}
