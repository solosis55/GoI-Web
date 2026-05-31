/** Alineado con `server/src/services/postMedia.ts` (solo imágenes, tope por adjunto/cantidad en servidor). */

export const POST_IMAGE_MAX_FILES = 4;
/** Tope del servidor para reels (parseStorySlidesFromRequest). */
export const STORY_IMAGE_MAX_FILES = 15;
/** Fotos por creación desde el modal de historia (la UI; más tarde «añadir más» desde el visor). */
export const STORY_UI_CREATE_MAX_SLIDES = 1;
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

/** Evita re-decodificar el mismo `dataUrl` en cada frame del editor de recorte. */
const decodedImageCache = new Map<string, HTMLImageElement>();
const DECODED_IMAGE_CACHE_MAX = 4;

function rememberDecodedImage(dataUrl: string, img: HTMLImageElement) {
  if (decodedImageCache.size >= DECODED_IMAGE_CACHE_MAX) {
    const first = decodedImageCache.keys().next().value;
    if (first !== undefined) decodedImageCache.delete(first);
  }
  decodedImageCache.set(dataUrl, img);
}

async function loadImageFromDataUrlCached(dataUrl: string): Promise<HTMLImageElement> {
  const cached = decodedImageCache.get(dataUrl);
  if (cached && cached.complete && cached.naturalWidth > 0) return cached;
  const blob = dataUrlToBlob(dataUrl);
  const img = await loadImage(blob);
  rememberDecodedImage(dataUrl, img);
  return img;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  const binary = atob(body ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
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

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("toBlob falló"));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/**
 * Misma compresión que `compressImageFileToDataUrlSafe`, pero devuelve un `File` JPEG
 * para subirlo al servidor sin meter base64 en el JSON del perfil.
 */
export async function compressImageFileToJpegFile(file: File, filename = "photo.jpg"): Promise<File> {
  const jpegName =
    filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg")
      ? filename
      : `${filename.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
  try {
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
      const blob = await canvasToJpegBlob(canvas);
      return new File([blob], jpegName, { type: "image/jpeg" });
    } finally {
      bitmap.close();
    }
  } catch {
    const dataUrl = await compressImageFileToDataUrlSafe(file);
    const blob = await fetch(dataUrl).then((r) => r.blob());
    return new File([blob], jpegName, { type: "image/jpeg" });
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
  onProgress?: (completed: number, total: number) => void,
): Promise<{ dataUrl: string; name: string }[]> {
  const files = [...incoming].filter((f) => f.type.startsWith("image/"));
  const slice = files.slice(0, Math.max(0, POST_IMAGE_MAX_FILES - alreadyCount));
  const out: { dataUrl: string; name: string }[] = [];
  onProgress?.(0, slice.length);
  for (const file of slice) {
    const dataUrl = await compressImageFileToDataUrlSafe(file);
    out.push({ dataUrl, name: file.name });
  }
  onProgress?.(out.length, slice.length);
  return out;
}

/** Recorte básico cuadrado centrado sobre una imagen base64. */
export type EditorFilterPreset = "none" | "contrast" | "warm" | "bw";

export type SquareCropOptions = {
  /** 1 = encuadre máximo posible, 3 = zoom x3 sobre el recorte cuadrado. */
  zoom?: number;
  /** Desplazamiento horizontal normalizado [-1, 1]. */
  offsetX?: number;
  /** Desplazamiento vertical normalizado [-1, 1]. */
  offsetY?: number;
  /** Giros de 90° en sentido horario (cualquier entero; se normaliza módulo 4). */
  rotateQuarterTurns?: number;
  /** Espejo horizontal respecto al encuadre actual (tras el giro). */
  flipHorizontal?: boolean;
  /** Filtro aplicado antes del recorte (vista previa y resultado). */
  filterPreset?: EditorFilterPreset;
  /**
   * Tope del lado del JPEG de salida (por defecto 1280). Valores bajos (~400) aceleran la vista previa al arrastrar.
   */
  previewMaxOutput?: number;
};

function editorFilterPresetToCss(preset: EditorFilterPreset | undefined): string {
  switch (preset ?? "none") {
    case "contrast":
      return "contrast(1.14) saturate(1.08)";
    case "warm":
      return "sepia(0.14) saturate(1.12) hue-rotate(-10deg)";
    case "bw":
      return "grayscale(1)";
    default:
      return "none";
  }
}

export async function cropDataUrlToSquare(dataUrl: string, options: SquareCropOptions = {}): Promise<string> {
  const img = await loadImageFromDataUrlCached(dataUrl);
  const R = ((((options.rotateQuarterTurns ?? 0) % 4) + 4) % 4);
  const flip = options.flipHorizontal ?? false;
  const ow = img.width;
  const oh = img.height;
  const cw = R % 2 === 0 ? ow : oh;
  const ch = R % 2 === 0 ? oh : ow;

  const transformCanvas = document.createElement("canvas");
  transformCanvas.width = cw;
  transformCanvas.height = ch;
  const tctx = transformCanvas.getContext("2d");
  if (!tctx) throw new Error("Canvas no disponible");
  tctx.filter = editorFilterPresetToCss(options.filterPreset);
  tctx.save();
  tctx.translate(cw / 2, ch / 2);
  tctx.rotate((R * Math.PI) / 2);
  tctx.scale(flip ? -1 : 1, 1);
  tctx.drawImage(img, -ow / 2, -oh / 2);
  tctx.restore();

  const tw = transformCanvas.width;
  const th = transformCanvas.height;
  const side = Math.max(1, Math.min(tw, th));
  const safeZoom = Math.min(3, Math.max(1, options.zoom ?? 1));
  const cropSide = Math.max(1, Math.round(side / safeZoom));
  const maxX = Math.max(0, tw - cropSide);
  const maxY = Math.max(0, th - cropSide);
  const normalizedX = Math.max(-1, Math.min(1, options.offsetX ?? 0));
  const normalizedY = Math.max(-1, Math.min(1, options.offsetY ?? 0));
  const sx = Math.round((maxX / 2) * (normalizedX + 1));
  const sy = Math.round((maxY / 2) * (normalizedY + 1));
  const outCap = Math.min(MAX_DIMENSION, Math.max(64, options.previewMaxOutput ?? MAX_DIMENSION));
  const target = Math.min(cropSide, outCap);
  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(transformCanvas, sx, sy, cropSide, cropSide, 0, 0, target, target);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export async function cropDataUrlToCenteredSquare(dataUrl: string): Promise<string> {
  return cropDataUrlToSquare(dataUrl, { zoom: 1, offsetX: 0, offsetY: 0 });
}
