import type { Metadata, Viewport } from "next";
import { Playfair_Display, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { AuthInitializer } from "@/components/AuthInitializer";
import { ThemeProvider } from "@/components/theme-provider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cognitive OS | AI Command Center",
  description:
    "The autonomous multi-agent operating system — persistent memory, real-time orchestration, and hyper-intelligent execution.",
  keywords: ["AI", "multi-agent", "operating system", "cognitive", "dashboard"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${instrument.variable} font-sans text-foreground bg-background antialiased transition-theme`}
      >
        <ThemeProvider>
          <AuthProvider>
            <AuthInitializer>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </AuthInitializer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

