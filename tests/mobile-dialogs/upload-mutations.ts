// Controlled upload responses for the real DocumentsStep browser fixture.
const previews = new Map<string, string>();

export async function uploadRequestDocumentFn({ data }: { data: FormData }) {
  const file = data.get("file") as File;
  const count = Number(localStorage.getItem("fixture-upload-count") ?? 0) + 1;
  localStorage.setItem("fixture-upload-count", String(count));
  if (new URLSearchParams(location.search).has("holdUpload")) {
    await new Promise<void>((resolve) => window.addEventListener("release-upload", () => resolve(), { once: true }));
  }
  const storagePath = `fixture/${count}/${file.name}`;
  previews.set(storagePath, URL.createObjectURL(file));
  return {
    error: false,
    uploadDraftId: "fixture-upload-draft",
    storagePath,
    fileName: file.name,
    fileSize: file.size,
  };
}

export async function deleteRequestDocumentFn() {
  return { error: false };
}

export async function getRequestDocumentPreviewUrlsFn({ data }: { data: { storagePaths: string[] } }) {
  return { error: false, urls: Object.fromEntries(data.storagePaths.map((path) => [path, previews.get(path)])) };
}
