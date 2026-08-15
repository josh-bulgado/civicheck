const AboutBanner = () => {
  return (
    <section className="border-t border-border bg-white" id="about">
      <div className="civic-container py-16">
        <div className="max-w-[640px]">
          <p className="civic-eyebrow">
            About
          </p>
          <h2 className="civic-title mb-4 text-[clamp(1.5rem,2.5vw,2rem)] leading-snug">
            City Civil Registrar Office, Legazpi City
          </h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            The City Civil Registrar Office (CCRO) of Legazpi City registers and
            issues official birth, marriage, death, and other civil registry
            records. CiviCheck was built to make that process clearer and faster
            for residents and staff alike, without changing how the office
            legally operates.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutBanner;
