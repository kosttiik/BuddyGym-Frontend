/* Re-encoding through a canvas shrinks the file and drops EXIF, which carries GPS. */

const MAX_EDGE = 1600;
const QUALITY = 0.82;
const DECODE_TIMEOUT_MS = 20_000;

export type CompressedPhoto = {
  file: File;
  originalBytes: number;
  bytes: number;
};

/* A 12MP shot costs ~48MB decoded, so the file is decoded once and once only: probing
   decodability with a throwaway createImageBitmap doubled that and stalled WebKit on 4GB
   iPhones. <img> also honours the EXIF orientation flag on drawImage, so a portrait shot
   does not come out sideways. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("cannot decode image"));
    };
    image.src = url;
  });
}

/* Only Safari decodes HEIC. Anything the browser cannot open falls back to libheif,
   which is wasm and therefore imported lazily. */
async function decode(file: File): Promise<HTMLImageElement> {
  try {
    return await loadImage(file);
  } catch {
    const { heicTo } = await import("heic-to/csp");
    const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
    return loadImage(new File([blob], "photo.jpg", { type: "image/jpeg" }));
  }
}

function scaledSize(width: number, height: number): [number, number] {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE) {
    return [width, height];
  }
  const ratio = MAX_EDGE / longest;
  return [Math.round(width * ratio), Math.round(height * ratio)];
}

/* WebKit under memory pressure drops decode and encode callbacks on the floor instead of
   failing, which leaves the caller waiting forever. A ceiling turns that into a retry. */
function withTimeout<T>(work: Promise<T>): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("photo processing timed out")), DECODE_TIMEOUT_MS);
    }),
  ]);
}

async function encode(file: File): Promise<CompressedPhoto> {
  const image = await decode(file);
  const [width, height] = scaledSize(image.naturalWidth, image.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas is unavailable");
  }
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", QUALITY);
  });
  if (!blob) {
    throw new Error("cannot encode image");
  }

  return {
    file: new File([blob], "checkin.jpg", { type: "image/jpeg" }),
    originalBytes: file.size,
    bytes: blob.size,
  };
}

export function compressPhoto(file: File): Promise<CompressedPhoto> {
  return withTimeout(encode(file));
}
