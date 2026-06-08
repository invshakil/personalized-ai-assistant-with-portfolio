import Image from "next/image";

const CV_URL =
  process.env.NEXT_PUBLIC_CV_URL ||
  "https://drive.google.com/file/d/15jSzTm3iaj_ghVqgC_t1Wk9bKnsIfGIA/view?usp=sharing";

export default function Hero() {
  return (
    <div className="sec" id="hero">
      <svg
        className="hero-corner-tl"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M0 60 L0 0 L60 0" stroke="#1e6b45" strokeWidth="1" opacity="0.14" />
        <path d="M0 90 L0 0 L90 0" stroke="#1e6b45" strokeWidth="0.5" opacity="0.08" />
      </svg>
      <svg
        className="hero-corner-br"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M120 60 L120 120 L60 120" stroke="#1e6b45" strokeWidth="1" opacity="0.14" />
        <path d="M120 30 L120 120 L30 120" stroke="#1e6b45" strokeWidth="0.5" opacity="0.08" />
      </svg>

      <div className="sec-in">
        <div className="hero-photo-wrap fu d1">
          <Image
            src="/shakil-profile.jpg"
            alt="Syful Islam Shakil"
            width={130}
            height={130}
            priority
          />
        </div>

        <div className="avail-badge fu d2">
          <span className="avail-dot" />
          <span>
            Available for freelance &mdash; <strong>as Tech Lead with a team</strong>
          </span>
        </div>

        <p className="avail-note fu d2">
          Part-time capacity &middot; Team leadership &middot; Project &amp; delivery ownership
        </p>

        <p className="hero-eyebrow fu d2">
          <span className="pulse" />
          Based in Comilla, Bangladesh
        </p>

        <h1 className="hero-name fu d3">
          Syful Islam
          <br />
          <em>Shakil</em>
        </h1>

        <p className="hero-title fu d4">Software Engineer &amp; Tech Lead</p>

        <p className="hero-bio fu d5">
          10 years building software that ships — for SaaS platforms, European agencies, and
          US-based startups. I&apos;ve led teams, owned architecture, designed interfaces, and kept
          deployments running. Currently leading frontend at a B2B talent intelligence platform in
          the UK while taking on freelance projects as Tech Lead with a delivery team. I work fast
          because I use AI tools the right way — not as a shortcut, but as leverage.
        </p>

        <div className="hero-stats fu d6">
          <div>
            <div className="stat-n">10+</div>
            <div className="stat-l">Years Experience</div>
          </div>
          <div>
            <div className="stat-n">Full</div>
            <div className="stat-l">Stack Coverage</div>
          </div>
          <div>
            <div className="stat-n">AI</div>
            <div className="stat-l">Augmented Workflow</div>
          </div>
        </div>

        <div className="hero-cta fu d6">
          <a href="#contact" className="btn-p">
            Get in touch →
          </a>
          <a href="#projects" className="btn-s">
            See my work
          </a>
          <a href={CV_URL} target="_blank" rel="noopener noreferrer" className="btn-cv">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CV
          </a>
        </div>
      </div>
    </div>
  );
}
