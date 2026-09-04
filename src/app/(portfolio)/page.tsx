import Hero from "@/components/portfolio/Hero";
import Skills from "@/components/portfolio/Skills";
import Experience from "@/components/portfolio/Experience";
import Projects from "@/components/portfolio/Projects";
import Testimonials from "@/components/portfolio/Testimonials";
import BookConsultation from "@/components/portfolio/BookConsultation";
import FloatingBookButton from "@/components/portfolio/FloatingBookButton";
import Contact from "@/components/portfolio/Contact";

export default function PortfolioPage() {
  return (
    <main>
      <Hero />
      <Skills />
      <Experience />
      <Projects />
      <Testimonials />
      <BookConsultation />
      <Contact />
      <FloatingBookButton />
    </main>
  );
}
