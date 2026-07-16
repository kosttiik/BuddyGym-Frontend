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

/* A 12MP shot costs ~48MB decoded. Decoding it twice (once to probe the format, once for
   real) stalled WebKit on 4GB iPhones and hung the checkin, so there is exactly one decode. */
function stubImageDecode(): { decodes: number } {
  const counter = { decodes: 0 };
  class FakeImage {
    naturalWidth = 4032;
    naturalHeight = 3024;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_url: string) {
      counter.decodes += 1;
      setTimeout(() => this.onload?.());
    }
  }
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() });
  return counter;
}

test("compression re-encodes to jpeg and shrinks the file, decoding it once", async () => {
  const originalBytes = 4 * 1024 * 1024;
  const big = new File([new Uint8Array(originalBytes)], "IMG_0001.jpg", { type: "image/jpeg" });

  const counter = stubImageDecode();
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
  expect(counter.decodes).toBe(1);

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
   can land on the telephoto, so the lens is switched by hand. Each getUserMedia costs another
   permission prompt inside Telegram, so opening the back camera must be a single call. */
test("the back camera opens with one request and the lens button switches it", async () => {
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

  const streamFor = (deviceId: string) => {
    const track = { stop: vi.fn(), getSettings: () => ({ deviceId }) };
    return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  };
  /* the platform default for "environment" is the telephoto on this device */
  const getUserMedia = vi.fn(async (c: MediaStreamConstraints) => {
    const video = c.video as { deviceId?: { exact: string }; facingMode?: string };
    if (video.deviceId) {
      return streamFor(video.deviceId.exact);
    }
    return streamFor(video.facingMode === "environment" ? "tele" : "front");
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

  /* one call for the front camera, one for the back: no per-lens probing */
  await waitFor(() => expect(screen.getByText("Lens 1/2")).toBeInTheDocument());
  expect(getUserMedia).toHaveBeenCalledTimes(2);
  expect(screen.getByText("Wrong lens? Tap to switch")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Switch lens" }));
  await waitFor(() =>
    expect(getUserMedia).toHaveBeenLastCalledWith({
      video: { deviceId: { exact: "main" } },
      audio: false,
    }),
  );
  expect(store.get("bg.camera.lens")).toBe("1");

  vi.unstubAllGlobals();
});
