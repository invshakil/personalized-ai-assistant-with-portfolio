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
    "PHP",
    "Laravel",
    "PostgreSQL",
    "MySQL",
    "Docker",
    "CI/CD",
    "Figma",
    "Claude API",
    "LLM Tool Use",
    "AI-assisted Development",
  ],
  description:
    "Software Engineer and Tech Lead with 10+ years of experience building full-stack products for SaaS platforms, European agencies, and US-based startups.",
  worksFor: {
    "@type": "Organization",
    name: "Savannah Group",
    url: "https://www.savannah-group.com",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Syful Islam Shakil — Portfolio",
  url: "https://sshakil.com",
  description:
    "Portfolio of Syful Islam Shakil, Senior Software Engineer and Tech Lead based in Bangladesh.",
  inLanguage: "en",
  author: { "@type": "Person", name: "Syful Islam Shakil" },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Syful Islam Shakil — Freelance Tech Lead",
  url: "https://sshakil.com",
  description:
    "Freelance Software Engineering and Tech Lead services for clients in Bangladesh, South Asia, Europe and the USA.",
  areaServed: ["Bangladesh", "South Asia", "Europe", "United States"],
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
    description: "Available for freelance projects as Tech Lead with a delivery team",
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
