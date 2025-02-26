import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { PlatformPreviewSection } from "@/components/sections/platform-preview";
import { FooterSection } from "@/components/sections/footer";
import { MoxiumText } from "@/components/sections/moxium-text";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black">
      <ScrollToTop />
      <HeroSection />
      <PlatformPreviewSection />
      <FeaturesSection />
      <MoxiumText />
      <FooterSection />
    </main>
  );
}
