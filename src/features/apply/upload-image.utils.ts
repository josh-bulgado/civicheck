/**
 * Phone cameras hand the upload step files it would reject or that are slow to
 * send: multi-megabyte JPEGs, HEIC/WebP, or an empty `file.type`. Normalising
 * images on the device keeps "Take photo" reliable and the upload small.
 *
 * PDFs and small JPEG/PNG files pass through untouched. If an image cannot be
 * decoded the original is returned, so the usual validation message still
 * explains what is wrong.
 */

const MAX_EDGE_PX = 2400;
const JPEG_QUALITY = 0.85;
/** JPEG/PNG files at or under this size are uploaded as they are. */
const PASS_THROUGH_BYTES = 1.5 * 1024 * 1024;

const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
};
const CONVERTIBLE_EXTENSIONS = new Set(["heic", "heif", "webp"]);

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to an <img> element for browsers without bitmap support.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function encodeAsJpeg(file: File): Promise<File> {
  const image = await decodeImage(file);
  try {
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");
    // JPEG has no alpha; a transparent PNG would otherwise turn black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image.source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("The image could not be encoded.");

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    image.release();
  }
}

export async function prepareUploadFile(file: File): Promise<File> {
  const extension = extensionOf(file.name);
  const type = file.type || TYPE_BY_EXTENSION[extension] || "";
  const typed =
    type && type !== file.type
      ? new File([file], file.name, { type, lastModified: file.lastModified })
      : file;

  if (type === "application/pdf") return typed;

  const isImage =
    type.startsWith("image/") || CONVERTIBLE_EXTENSIONS.has(extension);
  if (!isImage) return typed;

  const isCommonImage = type === "image/jpeg" || type === "image/png";
  if (isCommonImage && file.size <= PASS_THROUGH_BYTES) return typed;

  try {
    const jpeg = await encodeAsJpeg(typed);
    // Never make a file bigger just to change its format.
    return isCommonImage && jpeg.size >= typed.size ? typed : jpeg;
  } catch {
    return typed;
  }
}
