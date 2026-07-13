import { render, screen } from "@testing-library/react";
import type { Checkin } from "@/shared/api/types";
import { I18nProvider } from "@/shared/i18n";
import { en } from "@/shared/i18n/en";
import { compressPhoto } from "@/shared/lib/photo";
import { CheckinPhoto, photoExpiryLabel } from "./CheckinPhoto";

const NOW = new Date("2026-07-13T12:00:00Z").getTime();

function checkin(overrides: Partial<Checkin> = {}): Checkin {
  return {
    id: "c-1",
    room_id: 1,
    user_id: 1,
    status: "pending",
    has_photo: true,
    photo_purged: false,
    photo_expires_at: new Date(NOW + 5 * 86_400_000).toISOString(),
    votes_approve: 0,
    votes_reject: 0,
    votes_required: 2,
    created_at: new Date(NOW).toISOString(),
    expires_at: new Date(NOW + 86_400_000).toISOString(),
    ...overrides,
  };
}

test("counts down the days until the photo is purged", () => {
  expect(photoExpiryLabel(checkin(), en, NOW)).toBe("Photo is deleted in 5 days");
});

test("says the photo goes away today on the last day", () => {
  const soon = checkin({ photo_expires_at: new Date(NOW + 3_600_000).toISOString() });
  expect(photoExpiryLabel(soon, en, NOW)).toBe("Photo is deleted today");
});

test("reports a purged photo instead of a countdown", () => {
  const gone = checkin({ has_photo: false, photo_purged: true });
  expect(photoExpiryLabel(gone, en, NOW)).toBe("Photo deleted");
});

test("a geo checkin has no photo countdown", () => {
  const geo = checkin({ has_photo: false, photo_expires_at: undefined });
  expect(photoExpiryLabel(geo, en, NOW)).toBeNull();
});

/* The camera hands us multi-megabyte JPEGs with EXIF GPS inside. Re-encoding through a
   canvas is what both shrinks the file and drops the location tags. */
test("compression re-encodes to jpeg and shrinks the file", async () => {
  const originalBytes = 4 * 1024 * 1024;
  const big = new File([new Uint8Array(originalBytes)], "IMG_0001.jpg", { type: "image/jpeg" });

  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 4032, height: 3024, close: vi.fn() })),
  );
  const toBlob = vi.fn((cb: BlobCallback) => {
    cb(new Blob([new Uint8Array(300 * 1024)], { type: "image/jpeg" }));
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(toBlob);

  const result = await compressPhoto(big);

  expect(result.file.type).toBe("image/jpeg");
  expect(result.originalBytes).toBe(originalBytes);
  expect(result.bytes).toBeLessThan(originalBytes);
  expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.82);

  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("a purged photo renders a placeholder and never requests the bytes", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const gone = checkin({ has_photo: false, photo_purged: true });

  render(
    <I18nProvider>
      <CheckinPhoto checkin={gone} />
    </I18nProvider>,
  );

  expect(screen.getByText("Photo deleted")).toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
