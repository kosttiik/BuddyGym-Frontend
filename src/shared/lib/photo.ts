/* A phone camera hands us 3-12 MB. Re-encoding through a canvas cuts that to a few
   hundred KB and, just as importantly, drops the EXIF block: camera photos carry GPS
   coordinates, and we are not shipping the user's home address to the server. */

const MAX_EDGE = 1600;
const QUALITY = 0.82;

export type CompressedPhoto = {
  file: File;
  originalBytes: number;
  bytes: number;
};

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
  const bitmap = await loadBitmap(file);
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
