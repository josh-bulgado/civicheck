import { ChevronRight, ClipboardCheck, Landmark, Laptop, Search } from "lucide-react";

const steps = [
  { number: "1", title: "Check requirements", description: "Know what to bring.", icon: ClipboardCheck },
  { number: "2", title: "Apply online", description: "Send your papers early.", icon: Laptop },
  { number: "3", title: "Follow your request", description: "See where it stands.", icon: Search },
  { number: "4", title: "Bring your originals and claim", description: "Pick it up at the office.", icon: Landmark },
];

const HowItWorksSection = () => (
  <section className="landing-process" id="how-it-works" aria-labelledby="landing-process-title">
    <h2 id="landing-process-title">Four steps, one visit</h2>
    <ol className="landing-steps">
      {steps.map(({ number, title, description, icon: Icon }) => (
        <li key={number}>
          <div className="landing-step-icon" aria-hidden="true">
            <Icon />
          </div>
          <div className="landing-step-copy">
            <h3><span className="landing-step-number" aria-hidden="true">{number}</span>{title}</h3>
            <p>{description}</p>
          </div>
          {number !== "4" ? <ChevronRight className="landing-step-arrow" aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
  </section>
);

export default HowItWorksSection;
