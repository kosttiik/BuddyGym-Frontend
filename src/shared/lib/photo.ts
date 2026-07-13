/* Re-encoding through a canvas shrinks the file and drops EXIF, which carries GPS. */

const MAX_EDGE = 1600;
const QUALITY = 0.82;

export type CompressedPhoto = {
  file: File;
  originalBytes: number;
  bytes: number;
};

/* Only Safari decodes HEIC. Anything the browser cannot open falls back to libheif,
   which is wasm and therefore imported lazily. */
async function toDecodable(file: File): Promise<File> {
  if (await canDecodeNatively(file)) {
    return file;
  }
  const { heicTo } = await import("heic-to/csp");
  const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
}

async function canDecodeNatively(file: File): Promise<boolean> {
  if (typeof createImageBitmap !== "function") {
    return false;
  }
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    /* honours the EXIF orientation flag, so a portrait shot does not come out sideways */
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }
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

function scaledSize(width: number, height: number): [number, number] {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE) {
    return [width, height];
  }
  const ratio = MAX_EDGE / longest;
  return [Math.round(width * ratio), Math.round(height * ratio)];
}

export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  const decodable = await toDecodable(file);
  const bitmap = await loadBitmap(decodable);
  const [width, height] = scaledSize(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas is unavailable");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) {
    bitmap.close();
  }

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
