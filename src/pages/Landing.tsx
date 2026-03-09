import { Navbar } from "@/components/shared/Navbar";
import { Hero } from "@/components/landing/Hero";
import { CategoryShowcase } from "@/components/landing/CategoryShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { StyleShowcase } from "@/components/landing/StyleShowcase";
import { KitExplainer } from "@/components/landing/KitExplainer";
import { SizeComparison } from "@/components/landing/SizeComparison";
import { SizeVisualComparison } from "@/components/landing/SizeVisualComparison";
import { Testimonials } from "@/components/landing/Testimonials";
import { CTABanner } from "@/components/landing/CTABanner";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";
import { PromoBanner } from "@/components/shared/PromoBanner";
import { SocialProofToast } from "@/components/shared/SocialProofToast";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <PromoBanner />
      <Navbar />
      <Hero />
      <CategoryShowcase />
      <HowItWorks />
      <StyleShowcase />
      <KitExplainer />
      <SizeVisualComparison />
      <SizeComparison />
      <Testimonials />
      <CTABanner />
      <FAQ />
      <Footer />
      <SocialProofToast />
    </div>
  );
};

export default Landing;
