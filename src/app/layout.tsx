import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll";
import { Toaster } from "sonner";

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
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
