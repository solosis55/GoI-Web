/** Alineado con `server/src/services/postMedia.ts` (solo imágenes, tope por adjunto/cantidad en servidor). */

export const POST_IMAGE_MAX_FILES = 4;
export const STORY_IMAGE_MAX_FILES = 15;
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

function loadImage(bitmap: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(bitmap);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

/** Redimensiona y devuelve `data:image/jpeg;base64,...`. */
export async function compressImageFileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const tw = Math.max(1, Math.round(width * scale));
    const th = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no disponible");
    ctx.drawImage(bitmap, 0, 0, tw, th);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}

/** Variante usando `Image` si `createImageBitmap` falla (p. ej. algunos navegadores con ciertos TIFF). */
export async function compressImageFileToDataUrlSafe(file: File): Promise<string> {
  try {
    return await compressImageFileToDataUrl(file);
  } catch {
    const img = await loadImage(file);
    const { width, height } = img;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const tw = Math.max(1, Math.round(width * scale));
    const th = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no disponible");
    ctx.drawImage(img, 0, 0, tw, th);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  }
}

export async function compressManyStorySlides(
  incoming: FileList | File[],
  alreadyCount: number,
): Promise<{ dataUrl: string; name: string }[]> {
  const files = [...incoming].filter((f) => f.type.startsWith("image/"));
  const slice = files.slice(0, Math.max(0, STORY_IMAGE_MAX_FILES - alreadyCount));
  const out: { dataUrl: string; name: string }[] = [];
  for (const file of slice) {
    const dataUrl = await compressImageFileToDataUrlSafe(file);
    out.push({ dataUrl, name: file.name });
  }
  return out;
}

export async function compressManyImageFiles(
  incoming: FileList | File[],
  alreadyCount: number,
): Promise<{ dataUrl: string; name: string }[]> {
  const files = [...incoming].filter((f) => f.type.startsWith("image/"));
  const slice = files.slice(0, Math.max(0, POST_IMAGE_MAX_FILES - alreadyCount));
  const out: { dataUrl: string; name: string }[] = [];
  for (const file of slice) {
    const dataUrl = await compressImageFileToDataUrlSafe(file);
    out.push({ dataUrl, name: file.name });
  }
  return out;
}
