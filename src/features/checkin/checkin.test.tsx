import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Checkin } from "@/shared/api/types";
import { I18nProvider } from "@/shared/i18n";
import { en } from "@/shared/i18n/en";
import { compressPhoto } from "@/shared/lib/photo";
import { CameraCapture } from "./CameraCapture";
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

/* Android hands out wide, tele and macro alike as "camera2 N, facing back" and its default
   can land on the telephoto, so the main lens is found through the track capabilities. */
test("the back camera auto-picks the lens with the flash and the biggest sensor", async () => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  /* jsdom has no srcObject and no MediaStream */
  Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
    configurable: true,
    writable: true,
    value: null,
  });

  const caps: Record<string, MediaTrackCapabilities> = {
    tele: { width: { max: 3000 }, height: { max: 2250 } },
    main: { width: { max: 4032 }, height: { max: 3024 }, torch: true } as MediaTrackCapabilities,
  };
  const streamFor = (id: string) => {
    const track = { stop: vi.fn(), getCapabilities: () => caps[id] ?? {} };
    return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  };
  const getUserMedia = vi.fn(async (c: MediaStreamConstraints) => {
    const video = c.video as { deviceId?: { exact: string } };
    return streamFor(video?.deviceId?.exact ?? "front");
  });

  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices: {
      getUserMedia,
      enumerateDevices: vi.fn(async () => [
        { kind: "videoinput", deviceId: "front", label: "camera2 1, facing front" },
        { kind: "videoinput", deviceId: "tele", label: "camera2 3, facing back" },
        { kind: "videoinput", deviceId: "main", label: "camera2 0, facing back" },
      ]),
    },
  });

  render(
    <I18nProvider>
      <CameraCapture onCapture={vi.fn()} onPickGallery={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>,
  );

  await userEvent.click(await screen.findByRole("button", { name: "Flip camera" }));

  await waitFor(() =>
    expect(getUserMedia).toHaveBeenLastCalledWith({
      video: { deviceId: { exact: "main" } },
      audio: false,
    }),
  );
  expect(store.get("bg.camera.lens")).toBe("1");

  /* the manual override still cycles to the other lens */
  await userEvent.click(await screen.findByRole("button", { name: "Switch lens" }));
  await waitFor(() =>
    expect(getUserMedia).toHaveBeenLastCalledWith({
      video: { deviceId: { exact: "tele" } },
      audio: false,
    }),
  );

  vi.unstubAllGlobals();
});
