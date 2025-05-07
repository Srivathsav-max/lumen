import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/providers/smooth-scroll";
import { AuthProvider } from "@/providers/auth-provider";
import { NotificationProvider, ToastProvider } from "@/providers/notification-provider";

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
        <SmoothScrollProvider>
          <NotificationProvider>
            <ToastProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </ToastProvider>
          </NotificationProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
