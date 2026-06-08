import type { Testimonial } from "@/types";

const TESTIMONIALS: Testimonial[] = [
  {
    rating: 5,
    date: "Jan – Feb 2023",
    quote:
      "It has been a pleasure working with Shakil. He is a very experienced developer with excellent communication and people management skills. He is detail-oriented and always meets his deadlines. I can highly recommend working with Shakil.",
    tags: ["Collaborative", "Clear Communicator", "Detail Oriented", "Reliable"],
    project: "ReactJS Development · Client, Europe",
    source: "Upwork",
  },
  {
    rating: 5,
    date: "Aug 2020 – Dec 2022",
    quote:
      "When we started working together, I didn't realise it will be such a great experience to work with Shakil. He is a very reliable, hard-working person who has vast experience in full-stack development. Very good at communication and was always available whenever needed. He has solved a lot of complex functionality throughout these 2 years of working together. Hopefully, in future, we will work on more projects together.",
    tags: ["Reliable", "Clear Communicator", "Solution Oriented", "Collaborative"],
    project: "Senior Laravel & Vue.js Developer · Client, Europe · 1,510 hrs",
    source: "Upwork",
  },
];

const StarIcon = () => (
  <svg className="star" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const LinkIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

export default function Testimonials() {
  return (
    <div className="sec" id="testimonials">
      <div className="test-rule" />
      <div className="sec-in">
        <p className="lbl">Client Testimonials</p>
        <div className="test-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="test-card">
              <div className="test-stars">
                <div className="stars">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <StarIcon key={j} />
                  ))}
                </div>
                <span className="test-rating">{t.rating}.0</span>
                <span className="test-date">{t.date}</span>
              </div>
              <p className="test-quote">{t.quote}</p>
              <div className="test-tags">
                {t.tags.map((tag) => (
                  <span key={tag} className="test-tag">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="test-footer">
                <span className="test-project">{t.project}</span>
                <span className="test-source">
                  <LinkIcon />
                  {t.source}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="test-viewall-wrap">
          <a
            href="https://www.upwork.com/freelancers/~0136804dec393ef25f"
            target="_blank"
            rel="noopener noreferrer"
            className="test-viewall"
          >
            View all reviews on Upwork →
          </a>
        </div>
      </div>
    </div>
  );
}
