import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { PlatformPreviewSection } from "@/components/sections/platform-preview";
import { CTASection } from "@/components/sections/cta";

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black">
      <HeroSection />
      <FeaturesSection />
      <PlatformPreviewSection />
      <CTASection />
    </main>
  );
}
