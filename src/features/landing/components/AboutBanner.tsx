const AboutBanner = () => {
  return (
    <div className="bg-white border-t border-b border-gray-200">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <div className="border-l-[6px] border-l-[#e59700] bg-[#fef2e4] p-5 md:flex md:items-center md:gap-8">
          <h2 className="text-[22px] font-bold text-[#1b1b1b] mb-2 md:mb-0 md:min-w-[220px]">
            About CiviCheck
          </h2>
          <div className="text-[15px] text-[#444]">
            The City Civil Registrar Office (CCRO) of Legazpi City registers and
            issues official birth, marriage, death, and other civil registry
            records. CiviCheck was built to make that process clearer and faster
            for residents and staff alike, without changing how the office
            legally operates.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutBanner;
