import { useState, type CSSProperties } from "react";
import { QuietLink } from "~/components/quiet-link";
import { staggerStyle } from "~/components/motion/stagger";
import { cn } from "~/lib/utils";

// The four documents residents mostly come for, as the certificate itself.
// Colours are the category tints the services page uses: `from`/`to` is the
// tile's own wash (also the fallback when there is no photo), `scrim` its
// rgb triple for the fade that sits under the label.
const TILES = [
  {
    label: "Birth Certificate",
    photo: "/services/cert-birth.webp",
    from: "#dbe7fa",
    to: "#bfd3f2",
    scrim: "191 211 242",
    fromDark: "#1c2b45",
    toDark: "#172338",
    scrimDark: "23 35 56",
  },
  {
    label: "Marriage Certificate",
    photo: "/services/cert-marriage.webp",
    from: "#e9e6fa",
    to: "#d4cff2",
    scrim: "212 207 242",
    fromDark: "#261f3d",
    toDark: "#1f1a33",
    scrimDark: "31 26 51",
  },
  {
    label: "Death Certificate",
    photo: "/services/cert-death.webp",
    from: "#e6ebf4",
    to: "#cfd8e8",
    scrim: "207 216 232",
    fromDark: "#23272e",
    toDark: "#1c2026",
    scrimDark: "28 32 38",
  },
  {
    label: "Marriage License",
    photo: "/services/cert-license.webp",
    from: "#dcf0e5",
    to: "#bfe3cf",
    scrim: "191 227 207",
    fromDark: "#14291f",
    toDark: "#10221a",
    scrimDark: "16 34 26",
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
      className="absolute inset-0 size-full object-cover object-top transition-transform duration-300 ease-(--ease-civic) group-hover/tile:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover/tile:scale-100"
    />
  );
}

/**
 * Four tiles, each the certificate's own photo with its name across the foot.
 * Every tile opens the service catalogue.
 *
 * Two sizes. `strip` is for an applicant who already has a request: starting
 * another is not what they came for, so it is one slim row and the page
 * belongs to the tracker. Without it the tiles are the page, and fill whatever
 * height is left.
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
          : "flex-1 auto-rows-[minmax(7rem,1fr)] gap-4 max-md:flex-none md:gap-5 xl:auto-rows-[minmax(12.5rem,1fr)] xl:grid-cols-4",
        className,
      )}
    >
      {TILES.map((tile, index) => (
        <QuietLink
          key={tile.label}
          to="/services"
          style={
            {
              ...staggerStyle(index),
              "--tile-from": tile.from,
              "--tile-to": tile.to,
              "--tile-from-dark": tile.fromDark,
              "--tile-to-dark": tile.toDark,
              "--tile-scrim": tile.scrim,
              "--tile-scrim-dark": tile.scrimDark,
            } as CSSProperties
          }
          className={cn(
            "tile-wash group/tile relative flex flex-col justify-end overflow-hidden text-foreground max-md:h-47.5 max-md:w-39.5 max-md:shrink-0 max-md:snap-start max-md:rounded-4xl shadow-[0_1px_2px_rgba(15,27,45,0.05)] transition-[transform,box-shadow] duration-200 ease-(--ease-civic) motion-reduce:transition-none motion-reduce:hover:translate-y-0",
            strip
              ? "rounded-4xl hover:-translate-y-0.75 hover:shadow-[0_12px_28px_rgba(11,77,162,0.18)]"
              : "rounded-[28px] hover:-translate-y-1.25 hover:shadow-[0_20px_44px_rgba(11,77,162,0.2)]",
          )}
        >
          <Photo src={tile.photo} />
          {/* Tint only on the lower part, so most of the certificate stays
              readable and the label always has something to sit on. */}
          <span
            aria-hidden="true"
            className="tile-scrim pointer-events-none absolute inset-0"
          />
          <span
            className={cn(
              "relative leading-[1.2] font-semibold tracking-[-0.015em] max-md:px-3.5 max-md:pb-4 max-md:text-lg",
              strip
                ? "px-4 pb-3 text-base md:text-[17px]"
                : "px-5 pt-4 pb-4.5 text-xl xl:px-6 xl:pb-5 xl:text-[24px]",
            )}
          >
            {tile.label}
          </span>
        </QuietLink>
      ))}
    </div>
  );
}
