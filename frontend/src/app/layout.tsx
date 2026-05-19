import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthInitializer } from "@/components/AuthInitializer";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Cognitive OS | AI Command Center",
  description:
    "The autonomous multi-agent operating system — persistent memory, real-time orchestration, and hyper-intelligent execution.",
  keywords: ["AI", "multi-agent", "operating system", "cognitive", "dashboard"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020408" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans text-foreground bg-background antialiased overflow-hidden transition-theme`}
      >
        {/* ThemeProvider defaults (class attr, dark default, system detection, 
            persistent storageKey) are all baked into the component. */}
        <ThemeProvider>
          <AuthInitializer>
            {children}
          </AuthInitializer>
        </ThemeProvider>
      </body>
    </html>
  );
}
