import type { ContactLink, ContactIconType } from "@/types";

const CONTACT_LINKS: ContactLink[] = [
  {
    label: "Email",
    value: "syful.shakil.it@gmail.com",
    href: "mailto:syful.shakil.it@gmail.com",
    icon: "email",
  },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/syful-shakil",
    href: "https://www.linkedin.com/in/syful-shakil/",
    icon: "linkedin",
  },
  {
    label: "GitHub",
    value: "github.com/invshakil",
    href: "https://github.com/invshakil",
    icon: "github",
  },
  {
    label: "WhatsApp",
    value: "+880 1675 332 265",
    href: "https://wa.me/8801675332265",
    icon: "whatsapp",
  },
  {
    label: "Curriculum Vitae",
    value: "Download CV (PDF)",
    href:
      process.env.NEXT_PUBLIC_CV_URL ||
      "https://drive.google.com/file/d/15jSzTm3iaj_ghVqgC_t1Wk9bKnsIfGIA/view?usp=sharing",
    icon: "cv",
  },
];

function ContactIcon({ type }: { type: ContactIconType }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "rgba(255,255,255,.7)",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (type) {
    case "email":
      return (
        <svg {...props} aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...props} aria-hidden="true">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case "github":
      return (
        <svg {...props} aria-hidden="true">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...props} aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case "cv":
      return (
        <svg {...props} aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
  }
}

export default function Contact() {
  return (
    <div className="sec" id="contact">
      <div className="contact-rule" />
      <div className="sec-in">
        <p className="lbl" data-animate="true">
          Contact
        </p>
        <div className="contact-layout">
          <div>
            <h2 className="contact-heading" data-animate="true" data-delay="1">
              Let&apos;s build
              <br />
              something
              <br />
              together.
            </h2>
            <p className="contact-sub" data-animate="true" data-delay="2">
              Whether it&apos;s a product idea, a technical challenge, or a collaboration — I&apos;m
              always open to a good conversation.
            </p>
          </div>

          <div className="contact-links" data-animate="true" data-delay="2">
            {CONTACT_LINKS.map((link) => (
              <a
                key={link.icon}
                href={link.href}
                className="c-link"
                target={link.icon !== "email" ? "_blank" : undefined}
                rel={link.icon !== "email" ? "noopener noreferrer" : undefined}
              >
                <div className="c-left">
                  <div className="c-icon">
                    <ContactIcon type={link.icon} />
                  </div>
                  <div>
                    <div className="c-lbl">{link.label}</div>
                    <div className="c-val">{link.value}</div>
                  </div>
                </div>
                <span className="c-arr">→</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
