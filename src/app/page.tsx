import { Navbar } from "@/components/ui/navbar";
import { Hero } from "@/components/landing/hero";
import { FeatureSection } from "@/components/landing/feature-section";
import { CodeShowcase } from "@/components/landing/code-showcase";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-white antialiased dark:bg-black">
      <Navbar />
      <Hero />
      <FeatureSection />
      <CodeShowcase />
      <CTA />
      <Footer />
    </main>
  );
}
