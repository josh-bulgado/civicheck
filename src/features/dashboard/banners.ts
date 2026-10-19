import type { CSSProperties } from "react";

interface Banner {
  /** In `public/services/`, served from `/services/`. */
  file: string;
  /** Width over height of the picture, in pixels. */
  ratio: number;
  /**
   * The picture's own margin (a pale or transparent frame with rounded
   * corners), as a share of its width and of its height. It is pushed off the
   * card, so only the art shows.
   */
  marginX: number;
  marginY: number;
  /**
   * The colour along the picture's top and bottom edges. On a card taller than
   * the picture these fill the gap, so the picture fades into them unseen.
   */
  top: string;
  bottom: string;
  /** Overrides `BANNER_SCALE` for this picture. */
  scale?: number;
  /**
   * How far the picture is pulled in from the card's right edge, as a share of
   * the card's width. Past 0 its right edge is no longer outside the card, so
   * it fades out there as well. For a card with a button on the right that the
   * art should sit beside, not behind. Under 0 it goes the other way: pushed
   * further past the card's right edge, which crops it there.
   */
  shift?: number;
  /**
   * A CSS filter for the picture, to make its art stand out more. It also
   * moves `top` and `bottom`, so those are the colours after it.
   */
  filter?: string;
  /**
   * How solid the picture is, from 0 to 1 (1 when not set). Under 1 it lets the
   * card's fill show through, so the art sits paler and further back.
   */
  opacity?: number;
}

/**
 * How much of the card's width the picture takes, where 1 is edge to edge. The
 * art sits against the right side; under 1 its left edge fades into the card.
 */
const BANNER_SCALE = 0.85;

/**
 * The share of the card that the headline and tracker keep to, so they stay
 * clear of the art. It goes with `BANNER_SCALE`: a bigger picture reaches
 * further left and needs this smaller.
 */
const BANNER_TEXT_WIDTH = "64%";

// Used for a picture that has not been measured yet. Close enough that it
// still looks right; the numbers are then tuned to the file.
const UNMEASURED = {
  ratio: 3.2,
  marginX: 0.01,
  marginY: 0.03,
  top: "#d6e7fd",
  bottom: "#e6f0fd",
};

/**
 * Banner pictures for the dashboard's lead card, one per state it can show. A
 * missing file just leaves the gradient behind it showing.
 *
 * Rejected and released are not here: those requests never lead the dashboard.
 */
const BANNERS: Record<string, Banner> = {
  none: {
    file: "banner-background.webp",
    ratio: 2172 / 724,
    marginX: 0.0165,
    marginY: 0.069,
    // The picture's edge colours (#dcebfb, #e1eefc) after `filter`.
    top: "#d6eaff",
    bottom: "#ddeeff",
    // The "See all services" button sits at the card's right edge, which is
    // where this art used to be. Smaller and pulled in, it sits in the gap
    // between the headline and that button.
    scale: 0.75,
    shift: 0.2,
    // The art is pale against the card. Stretching contrast around the card's
    // own colour darkens the art and leaves the plain background where it was.
    filter: "brightness(0.83) contrast(1.6)",
  },
  submitted: {
    file: "banner-submitted.webp",
    ratio: 1916 / 821,
    marginX: 0.0021,
    marginY: 0.0067,
    // This picture is taller than the card, so only its middle shows, and the
    // plain fill beside it has to meet its left edge at about 13% and 87% down
    // (not its top and bottom rows, #bcd7fd and #e7f1fd).
    top: "#b5d0fa",
    bottom: "#d5e7fe",
  },
  under_validation: { file: "banner-under-validation.webp", ...UNMEASURED },
  incomplete: { file: "banner-incomplete.webp", ...UNMEASURED },
  processing: {
    file: "banner-processing.webp",
    ratio: 2172 / 724,
    // A thin frame (12px at the sides and top, 18px at the bottom).
    marginX: 0.0055,
    marginY: 0.0207,
    // This picture is shorter than the card, so a plain fill shows above and
    // below it, meeting its left edge at about 8% and 90% down (#dcebfd and
    // #e0edfd). The picture is nearly even along its edges, so the two sit close.
    top: "#dcebfd",
    bottom: "#e0edfe",
    // Smaller than the others, and a little further to the right, so the art
    // stays clear of the tracker's Release node.
    scale: 0.75,
    shift: -0.015,
    opacity: 0.8,
  },
  ready_for_release: {
    file: "banner-ready-for-release.webp",
    ratio: 2172 / 724,
    // A thin frame (about 10px at the sides, 25px at the top and bottom). It
    // came with black outside its rounded corners, repainted pale like the
    // others before it was converted, so none of it can show at the edges.
    marginX: 0.0044,
    marginY: 0.0345,
    // The plain fill above and below the picture meets its left edge at about
    // 8% and 90% down (#e8f2fc and #deebfd). Its right side runs a little
    // lighter at the bottom, so the bottom sits between the two.
    top: "#e9f3fd",
    bottom: "#e2eefb",
    // The same size as the processing banner, to keep the art clear of the
    // tracker's Release node.
    scale: 0.75,
  },
};

/**
 * Sets what the `portal-banner` class reads. `status` is a request status, or
 * "none" for an applicant with no requests yet.
 */
export function bannerStyle(status: string): CSSProperties {
  const banner = BANNERS[status];
  const measures = banner ?? UNMEASURED;
  return {
    "--banner": banner ? `url("/services/${banner.file}")` : "none",
    "--banner-scale": String(banner?.scale ?? BANNER_SCALE),
    "--banner-shift": String(banner?.shift ?? 0),
    "--banner-filter": banner?.filter ?? "none",
    "--banner-opacity": String(banner?.opacity ?? 1),
    // A picture inside the card needs its right side faded; one pushed past the
    // edge has that side cropped off already.
    "--banner-fade-right": banner?.shift && banner.shift > 0 ? "14%" : "0%",
    "--banner-text": BANNER_TEXT_WIDTH,
    "--banner-ratio": String(measures.ratio),
    "--banner-mx": String(measures.marginX),
    "--banner-my": String(measures.marginY),
    "--banner-top": measures.top,
    "--banner-bottom": measures.bottom,
  } as CSSProperties;
}
