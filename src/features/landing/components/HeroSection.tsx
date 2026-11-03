import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { QuietLink as Link } from "~/components/quiet-link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { FeaturedChecklist } from "../landing.queries";
import { landingAssets } from "../landing-assets";

const documentTypes = [
  { group: "birth_ontime", label: "Birth", title: "Birth Certificate" },
  { group: "marriage_license", label: "Marriage", title: "Marriage License" },
  { group: "death_delayed", label: "Death", title: "Death Certificate" },
  { group: "ctc_issuance", label: "Certified copy", title: "Certified True Copy" },
];

const CHECKLIST_INTERVAL_MS = 5000;

function ChecklistCard({ checklists }: { checklists: FeaturedChecklist[] }) {
  const [activeGroup, setActiveGroup] = useState(documentTypes[0].group);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRotationEnabled(!motion.matches);
    setPageVisible(!document.hidden);

    const onMotionChange = (event: MediaQueryListEvent) => setRotationEnabled(!event.matches);
    const onVisibilityChange = () => setPageVisible(!document.hidden);
    motion.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      motion.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const canRotate = rotationEnabled && !hovered && !focused && pageVisible;

  useEffect(() => {
    if (!canRotate) return;
    const timer = window.setTimeout(() => {
      setActiveGroup((current) => {
        const index = documentTypes.findIndex((entry) => entry.group === current);
        return documentTypes[(index + 1) % documentTypes.length].group;
      });
    }, CHECKLIST_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [activeGroup, canRotate]);

  return (
    <Tabs
      value={activeGroup}
      onValueChange={(value) => {
        if (typeof value === "string") setActiveGroup(value);
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        const isRotationControl = event.target instanceof HTMLElement &&
          event.target.closest("[data-rotation-control]") !== null;
        setFocused(!isRotationControl);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      className="landing-checklist"
    >
      <TabsList variant="soft" aria-label="Document requirements" className="landing-document-tabs">
        {documentTypes.map(({ group, label }) => (
          <TabsTrigger key={group} value={group} className="landing-document-tab">
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {documentTypes.filter(({ group }) => group === activeGroup).map(({ group, title }) => {
        const checklist = checklists.find((entry) => entry.group.toLowerCase() === group);

        return (
          <TabsContent key={group} value={group} className="landing-checklist-panel">
            <div className="landing-checklist-body">
              <h2>{title}</h2>
              {checklist ? <p className="sr-only">{checklist.displayName}</p> : null}
              {checklist ? (
                <ol className="landing-requirements">
                  {checklist.items.map((item, index) => (
                    <li key={item.name}>
                      <span className="landing-requirement-number" aria-hidden="true">{index + 1}</span>
                      <span>{item.name}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="landing-checklist-unavailable">
                  Open the service guide to check the current requirements for this document.
                </p>
              )}
            </div>
            <div className="landing-checklist-actions">
              <button
                type="button"
                data-rotation-control
                className="landing-rotation-toggle"
                aria-label={rotationEnabled ? "Pause automatic rotation" : "Start automatic rotation"}
                title={rotationEnabled ? "Pause automatic rotation" : "Start automatic rotation"}
                onClick={() => setRotationEnabled((enabled) => !enabled)}
              >
                {rotationEnabled ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              </button>
              {checklist && checklist.remainingCount > 0 ? (
                <Link
                  to="/requirements"
                  search={{ code: checklist.linkCode }}
                  className="landing-more-requirements"
                >
                  + {checklist.remainingCount} more<span className="landing-more-label"> requirements</span>
                </Link>
              ) : null}
              <Link
                to="/requirements"
                search={{ code: checklist?.linkCode }}
                className="landing-button landing-button-primary landing-start-button"
              >
                {checklist ? "Start application" : "Check requirements"}
              </Link>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

const HeroSection = ({ checklists }: { checklists: FeaturedChecklist[] }) => (
  <section className="landing-hero" aria-labelledby="landing-title">
    <img className="landing-hero-background" src={landingAssets.background} alt="" aria-hidden="true" />
    <div className="landing-hero-content">
      <div className="landing-hero-copy">
        <h1 id="landing-title">
          Know what<br />you need.
          <span>Before you need it.</span>
        </h1>
        <div className="landing-hero-actions">
          <Link to="/requirements" className="landing-button landing-button-primary">
            Check requirements
          </Link>
          <Link to="/track" className="landing-button landing-button-secondary">
            Track a request
          </Link>
        </div>
      </div>
      <div className="landing-hero-preview">
        <img className="landing-certificate-art" src={landingAssets.certificate} alt="" aria-hidden="true" />
        <img className="landing-id-art" src={landingAssets.id} alt="" aria-hidden="true" />
        <ChecklistCard checklists={checklists} />
      </div>
    </div>
  </section>
);

export default HeroSection;
