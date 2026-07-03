const AboutBanner = () => {
  return (
    <section className="bg-white border-t border-basalt/5" id="about">
      <div className="max-w-[1120px] mx-auto px-5 py-16">
        <div className="max-w-[640px]">
          <p className="text-[12px] font-semibold tracking-widest uppercase text-lagoon mb-3">
            About
          </p>
          <h2 className="font-display text-[clamp(1.5rem,2.5vw,2rem)] text-basalt leading-snug mb-4">
            City Civil Registrar Office, Legazpi City
          </h2>
          <p className="text-[15px] text-slate leading-relaxed">
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
