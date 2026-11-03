const FRAME_ATTRIBUTE = "data-print-frame";

function waitForStylesheet(link: HTMLLinkElement): Promise<void> {
  return new Promise((resolve) => {
    link.addEventListener("load", () => resolve(), { once: true });
    // A stylesheet that fails to load should not stop the printout.
    link.addEventListener("error", () => resolve(), { once: true });
  });
}

/**
 * Prints one element on its own, on paper that has nothing else of the app on it.
 *
 * The element is copied into a hidden frame together with the page's styles, and
 * the frame is printed. That keeps the sidebar, scroll areas and fixed heights
 * around the element out of the print layout altogether, instead of relying on
 * print rules to switch them off, and it gives the frame a light theme whatever
 * the app is showing. The frame's title becomes the suggested PDF file name.
 *
 * Browser only: call it from an event handler.
 */
export async function printElement(element: HTMLElement, title: string): Promise<void> {
  document.querySelectorAll(`iframe[${FRAME_ATTRIBUTE}]`).forEach((stale) => stale.remove());

  const frame = document.createElement("iframe");
  frame.setAttribute(FRAME_ATTRIBUTE, "");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  // Not display:none, which some browsers print as a blank page; and not
  // visibility:hidden, which Firefox prints as blank.
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "1px",
    height: "1px",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    throw new Error("The print frame could not be opened.");
  }

  doc.open();
  doc.write('<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>');
  doc.close();
  doc.title = title;
  doc.body.style.background = "#fff";

  const loading: Promise<void>[] = [];
  document.querySelectorAll<HTMLElement>('link[rel="stylesheet"], style').forEach((node) => {
    const copy = node.cloneNode(true) as HTMLLinkElement | HTMLStyleElement;
    if (copy instanceof HTMLLinkElement) loading.push(waitForStylesheet(copy));
    doc.head.appendChild(copy);
  });
  doc.body.appendChild(doc.importNode(element, true));

  // Print once the styles and fonts are in, or the page comes out in fallback type.
  await Promise.all(loading);
  await doc.fonts?.ready;

  win.addEventListener("afterprint", () => frame.remove(), { once: true });
  win.focus();
  win.print();
}
