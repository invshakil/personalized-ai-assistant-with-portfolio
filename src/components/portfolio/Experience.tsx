import ExperienceItem from "./experience/ExperienceItem";
import { EXPERIENCE } from "./experience/experienceData";

export default function Experience() {
  return (
    <div className="sec" id="experience">
      <div className="exp-rule" />
      <div className="sec-in">
        <p className="lbl" data-animate="true">
          Work Experience
        </p>
        <div className="exp-list">
          {EXPERIENCE.map((item, i) => (
            <ExperienceItem key={item.company} item={item} delay={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
