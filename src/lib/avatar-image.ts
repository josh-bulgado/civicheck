export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";
export const AVATAR_MAX_SOURCE_BYTES = 10 * 1024 * 1024;

const AVATAR_SIZE = 256;
const AVATAR_QUALITY = 0.86;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Why a chosen file can't be used, or null when it can. */
export function checkAvatarFile(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return "Choose a JPG, PNG or WebP image.";
  }
  if (file.size > AVATAR_MAX_SOURCE_BYTES) {
    return "That image is too large. Choose one under 10 MB.";
  }
  return null;
}

/**
 * Centre-crops the image to a square and shrinks it to 256px, so a phone photo
 * of several megabytes uploads as a few kilobytes. JPEG rather than WebP:
 * Safari can't encode WebP and would hand back a PNG instead.
 */
export async function prepareAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is not available.");

    // A transparent PNG would turn black as a JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", AVATAR_QUALITY),
    );
    if (!blob) throw new Error("The image could not be processed.");
    return blob;
  } finally {
    bitmap.close();
  }
}
