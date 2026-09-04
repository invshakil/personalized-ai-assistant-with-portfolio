import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Syful Islam Shakil",
  jobTitle: "Software Engineer & Tech Lead",
  url: "https://sshakil.com",
  email: "syful.shakil.it@gmail.com",
  telephone: "+8801675332265",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Comilla",
    addressRegion: "Chattogram",
    addressCountry: "BD",
    countryName: "Bangladesh",
  },
  areaServed: ["Bangladesh", "South Asia", "United Kingdom", "Europe", "United States"],
  availableLanguage: ["English", "Bengali"],
  sameAs: [
    "https://www.linkedin.com/in/syful-shakil/",
    "https://github.com/invshakil",
    "https://www.upwork.com/freelancers/~0136804dec393ef25f",
  ],
  knowsAbout: [
    "React",
    "Next.js",
    "TypeScript",
    "Node.js",
    "NestJS",
    "PHP",
    "Laravel",
    "PostgreSQL",
    "MySQL",
    "Docker",
    "CI/CD",
    "WebSockets",
    "Claude API",
    "OpenAI API",
    "LLM Tool Use",
    "AI-assisted Development",
  ],
  description:
    "Senior full-stack engineer and tech lead with 10+ years of experience building products for SaaS platforms, European agencies, and US-based startups. Available for European remote contracts.",
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "University of Information Technology & Science (UITS)",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Syful Islam Shakil — Portfolio",
  url: "https://sshakil.com",
  description:
    "Portfolio of Syful Islam Shakil, senior software engineer and tech lead based in Bangladesh, available for European remote contracts.",
  inLanguage: "en",
  author: { "@type": "Person", name: "Syful Islam Shakil" },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Syful Islam Shakil — Contract Software Engineer & Tech Lead",
  url: "https://sshakil.com",
  description:
    "Contract software engineering and tech lead services, working remotely with clients in Europe, the UK, and the USA.",
  areaServed: ["Europe", "United Kingdom", "United States", "Bangladesh"],
  provider: { "@type": "Person", name: "Syful Islam Shakil" },
  serviceType: [
    "Software Engineering",
    "Frontend Development",
    "Backend Development",
    "Technical Leadership",
    "Full Stack Development",
    "AI Integration",
  ],
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    description:
      "Available now for full-capacity European remote contracts — B2B contractor or EOR, no relocation",
  },
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <div className="portfolio-frame">
        <Nav />
        {children}
        <Footer />
      </div>
    </>
  );
}
