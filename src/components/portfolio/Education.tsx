import type { EducationItem } from "@/types";

const EDUCATION: EducationItem[] = [
  {
    years: "2012 – 2017",
    degree: "Bachelor of Science in Information Technology (BSc IT)",
    institution: "University of Information Technology & Science (UITS) — Dhaka",
  },
  {
    years: "2007 – 2009",
    degree: "Higher Secondary Certificate",
    institution: "Comilla Victoria Government College — Comilla",
  },
  {
    years: "2002 – 2007",
    degree: "Secondary School Certificate",
    institution: "Ibn Taimia School & College — Comilla",
  },
];

export default function Education() {
  return (
    <div className="sec" id="education">
      <div className="edu-rule" />
      <div className="sec-in">
        <p className="lbl" data-animate="true">
          Education
        </p>
        <div className="edu-list">
          {EDUCATION.map((item, i) => (
            <div
              key={item.years}
              className="edu-item"
              data-animate="true"
              data-delay={String(i + 1)}
            >
              <p className="edu-year">{item.years}</p>
              <p className="edu-degree">{item.degree}</p>
              <p className="edu-inst">{item.institution}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
