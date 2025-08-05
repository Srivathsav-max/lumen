import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/providers/smooth-scroll";
import { AuthProvider } from "@/providers/auth-provider";
import { NotificationProvider, ToastProvider } from "@/providers/notification-provider";
import { Suspense } from "react";
import { PerformanceMonitorComponent } from "@/components/performance/performance-monitor";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Moxium - A Unit for Your Brilliance",
  description: "Experience personalized, adaptive learning powered by AI. Master new skills at your own pace with Moxium's intelligent education platform.",
  keywords: "adaptive learning, AI education, personalized learning, online education",
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
        <SmoothScrollProvider>
          <NotificationProvider>
            <ToastProvider>
              <AuthProvider>
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#333]"></div>
                  </div>
                }>
                  {children}
                </Suspense>
              </AuthProvider>
            </ToastProvider>
          </NotificationProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
