import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { AIProvider } from "@/providers/ai-provider";
import { Suspense } from "react";
import { PerformanceMonitorComponent } from "@/components/performance/performance-monitor";
import { Spinner } from "@/components/ui/ios-spinner";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lumen",
  description: "Your application description here.",
  keywords: "your, keywords, here",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="preload" href="/api/upload" as="fetch" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={inter.className}>
        <PerformanceMonitorComponent />
        <AuthProvider>
          <AIProvider>
            <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <Spinner size="lg" />
            </div>
          }>
            {children}
          </Suspense>
          </AIProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
