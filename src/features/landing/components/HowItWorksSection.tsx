const steps = [
  { number: "1", title: "Check requirements", description: "Know what to bring." },
  { number: "2", title: "Apply online", description: "Send your papers early." },
  { number: "3", title: "Follow your request", description: "See where it stands." },
  { number: "4", title: "Bring your originals and claim", description: "Pick it up at the office." },
];

const HowItWorksSection = () => (
  <section className="landing-process" id="how-it-works" aria-labelledby="landing-process-title">
    <h2 id="landing-process-title">Four steps, one visit</h2>
    <ol className="landing-steps">
      {steps.map((step) => (
        <li key={step.number}>
          <div className="landing-step-marker">
            <span>{step.number}</span>
          </div>
          <h3>{step.title}</h3>
          <p>{step.description}</p>
        </li>
      ))}
    </ol>
  </section>
);

export default HowItWorksSection;
