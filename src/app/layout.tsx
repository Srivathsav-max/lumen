import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
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
      <body className={inter.className}>
        <PerformanceMonitorComponent />
        <AuthProvider>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <Spinner size="lg" />
            </div>
          }>
            {children}
          </Suspense>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
