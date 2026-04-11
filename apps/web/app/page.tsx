import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Modules } from "@/components/Modules";
import { WhyChoose } from "@/components/WhyChoose";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Modules />
      <WhyChoose />
      <CTA />
      <Footer />
    </main>
  );
}
