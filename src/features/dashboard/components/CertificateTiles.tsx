import { useState, type CSSProperties } from "react";
import { QuietLink } from "~/components/quiet-link";
import { staggerStyle } from "~/components/motion/stagger";
import { cn } from "~/lib/utils";

// The four things residents mostly come for. Each tile is its illustration over
// a tint, with the name and one line about it underneath. `from`/`to` is the
// tint behind the illustration (also what shows if the file is missing);
// `fromDark`/`toDark` is the same tint in dark mode. They are handed to the
// `tile-wash` class as CSS variables because inline style cannot switch on
// `.dark`.
const TILES = [
  {
    label: "Birth Certificate",
    category: "birth",
    blurb: "Register a new birth, on time or late.",
    photo: "/services/cert-birth-clean.webp",
    from: "#e6effc",
    to: "#d3e2f8",
    fromDark: "#1c2b45",
    toDark: "#172338",
  },
  {
    label: "Marriage Certificate",
    category: "marriage",
    blurb: "Register a marriage, on time or late.",
    photo: "/services/cert-marriage-clean.webp",
    from: "#fdf1f2",
    to: "#fadde1",
    fromDark: "#3a2230",
    toDark: "#2e1a26",
  },
  {
    label: "Death Certificate",
    category: "death",
    blurb: "Register a death, on time or late.",
    photo: "/services/cert-death-clean.webp",
    from: "#efecfa",
    to: "#ddd8f4",
    fromDark: "#27233d",
    toDark: "#201d33",
  },
  {
    label: "Marriage License",
    category: "marriage",
    blurb: "Apply for a marriage license at the CCRO.",
    photo: "/services/cert-license-clean.webp",
    from: "#e8f6ee",
    to: "#d2eddc",
    fromDark: "#14291f",
    toDark: "#10221a",
  },
] as const;

// A photo that failed to load once is not asked for again while the page stays
// open, so a tile without its file costs one request, not one per visit.
const missingPhotos = new Set<string>();

function Photo({ src }: { src: string }) {
  const [missing, setMissing] = useState(() => missingPhotos.has(src));
  if (missing) return null;

  return (
    <img
      src={src}
      alt=""
      decoding="async"
      onError={() => {
        missingPhotos.add(src);
        setMissing(true);
      }}
      className="absolute inset-0 size-full object-contain transition-transform duration-300 ease-(--ease-civic) group-hover/tile:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover/tile:scale-100"
    />
  );
}

/**
 * Four tiles, each the illustration on a tint with its name and a line about it
 * underneath. Every tile opens the service catalogue.
 *
 * Two sizes. `strip` is for an applicant who already has a request: starting
 * another is not what they came for, so it is one slim row (a small
 * illustration beside the name) and the page belongs to the tracker. Without it
 * the tiles use bounded artwork panels so taller screens do not enlarge them.
 */
export function CertificateTiles({
  strip = false,
  className,
}: {
  strip?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Four across where there is room; two by two below that, never three
        // and one.
        // On a phone the tiles are one row that scrolls sideways, running to
        // the screen's edge so the next one peeks in.
        "civic-stagger max-md:-mx-5 max-md:flex max-md:snap-x max-md:gap-3 max-md:overflow-x-auto max-md:px-5 max-md:pb-1 max-md:[scrollbar-width:none] md:grid md:grid-cols-2",
        strip
          ? "auto-rows-[5rem] gap-3 md:auto-rows-[6rem] md:grid-cols-4 md:gap-4"
          : "shrink-0 gap-4 md:gap-5 xl:grid-cols-4",
        className,
      )}
    >
      {TILES.map((tile, index) => (
        <QuietLink
          key={tile.label}
          to="/services"
          search={{ category: tile.category }}
          style={
            {
              ...staggerStyle(index),
              "--tile-from": tile.from,
              "--tile-to": tile.to,
              "--tile-from-dark": tile.fromDark,
              "--tile-to-dark": tile.toDark,
            } as CSSProperties
          }
          className={cn(
            "group/tile relative flex flex-col overflow-hidden bg-card text-foreground max-md:h-47.5 max-md:w-39.5 max-md:shrink-0 max-md:snap-start max-md:rounded-4xl shadow-[0_1px_2px_rgba(15,27,45,0.05)] transition-[transform,box-shadow] duration-200 ease-(--ease-civic) motion-reduce:transition-none motion-reduce:hover:translate-y-0",
            strip
              ? "rounded-4xl md:flex-row md:items-center hover:-translate-y-0.75 hover:shadow-[0_12px_28px_rgba(11,77,162,0.18)]"
              : "rounded-[28px] hover:-translate-y-1.25 hover:shadow-[0_20px_44px_rgba(11,77,162,0.2)]",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "tile-wash relative min-h-24 flex-1 overflow-hidden",
              strip
                ? "md:h-full md:min-h-0 md:w-24 md:flex-none"
                : "md:aspect-[6/5] md:max-h-72 md:w-full md:flex-none md:rounded-[24px]",
            )}
          >
            <Photo src={tile.photo} />
          </span>
          <span
            className={cn(
              "flex items-start justify-between gap-3 px-3.5 pt-3 pb-3.5",
              strip
                ? "md:flex-1 md:items-center md:p-0 md:pr-4 md:pl-4"
                : "md:min-h-32 md:px-5 md:pt-4 md:pb-5 xl:px-6 xl:pb-6",
            )}
          >
            <span className="min-w-0">
              <span
                className={cn(
                  "block leading-[1.2] font-semibold tracking-[-0.015em] max-md:text-base",
                  strip ? "md:line-clamp-2 md:text-[17px]" : "text-xl xl:text-[22px]",
                )}
              >
                {tile.label}
              </span>
              <span
                className={cn(
                  "mt-1.5 line-clamp-2 text-[15px] leading-snug text-muted-foreground max-md:hidden",
                  strip && "md:hidden",
                )}
              >
                {tile.blurb}
              </span>
            </span>
          </span>
        </QuietLink>
      ))}
    </div>
  );
}
