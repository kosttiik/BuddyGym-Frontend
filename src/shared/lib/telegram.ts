import {
  backButton,
  init,
  locationManager,
  miniApp,
  requestWriteAccess,
  retrieveLaunchParams,
  retrieveRawInitData,
  shareURL,
  swipeBehavior,
  themeParams,
  viewport,
} from "@telegram-apps/sdk-react";

let insideTelegram = false;

/* checkin-service rejects anything worse than this, so fail before the round trip */
const MAX_ACCURACY_METERS = 50;

type TelegramLocation = {
  latitude: number;
  longitude: number;
  horizontal_accuracy?: number | null;
};

export type GeoPoint = { lat: number; lon: number; horizontal_accuracy: number };

/* unsupported: Telegram is too old; unavailable: Telegram itself has no OS location permission;
   denied: the user rejected the bot's request; accuracy: GPS fix too coarse to be accepted */
export type GeoResult =
  | { ok: true; geo: GeoPoint }
  | { ok: false; reason: "unsupported" | "unavailable" | "denied" | "accuracy" };

export function isInsideTelegram(): boolean {
  return insideTelegram;
}

/* Initializes the SDK; safely no-ops in a plain browser (dev/mock mode). */
export function initTelegram(): void {
  try {
    init();
    insideTelegram = true;
  } catch {
    insideTelegram = false;
    return;
  }
  if (backButton.mount.isAvailable()) {
    backButton.mount();
  }
  if (miniApp.mountSync.isAvailable()) {
    miniApp.mountSync();
  }
  if (themeParams.mountSync.isAvailable()) {
    themeParams.mountSync();
  }
  if (swipeBehavior.mount.isAvailable()) {
    swipeBehavior.mount();
    if (swipeBehavior.disableVertical.isAvailable()) {
      swipeBehavior.disableVertical();
    }
  }
  if (viewport.mount.isAvailable()) {
    void viewport.mount().then(() => {
      if (viewport.expand.isAvailable()) {
        viewport.expand();
      }
      /* publishes --tg-viewport-safe-area-inset-* and --tg-viewport-content-safe-area-inset-*,
         which feed --safe-top / --safe-bottom in tokens.css: the device notch plus the strip
         Telegram's own header buttons occupy */
      if (viewport.bindCssVars.isAvailable()) {
        viewport.bindCssVars();
      }
    });
  }
}

export function getRawInitData(): string | undefined {
  try {
    return retrieveRawInitData();
  } catch {
    return undefined;
  }
}

export async function getTelegramLocation(): Promise<GeoResult> {
  if (!locationManager.mount.isAvailable()) {
    return { ok: false, reason: "unsupported" };
  }
  try {
    if (!locationManager.isMounted()) {
      await locationManager.mount();
    }
  } catch {
    return { ok: false, reason: "unsupported" };
  }
  if (!locationManager.isAvailable() || !locationManager.requestLocation.isAvailable()) {
    return { ok: false, reason: "unavailable" };
  }

  let location: TelegramLocation | undefined;
  try {
    location = await locationManager.requestLocation();
  } catch {
    return { ok: false, reason: "denied" };
  }
  if (!location) {
    return { ok: false, reason: "denied" };
  }

  const accuracy = location.horizontal_accuracy;
  if (
    typeof accuracy !== "number" ||
    !Number.isFinite(accuracy) ||
    accuracy <= 0 ||
    accuracy > MAX_ACCURACY_METERS
  ) {
    return { ok: false, reason: "accuracy" };
  }
  return {
    ok: true,
    geo: { lat: location.latitude, lon: location.longitude, horizontal_accuracy: accuracy },
  };
}

/* Telegram's own per-bot location screen; the only way back after the user denied access */
export function openTelegramLocationSettings(): boolean {
  if (!locationManager.openSettings.isAvailable()) {
    return false;
  }
  locationManager.openSettings();
  return true;
}

export function getStartParam(): string | undefined {
  try {
    return retrieveLaunchParams().tgWebAppStartParam;
  } catch {
    return undefined;
  }
}

/* iOS WKWebView honours <input capture> and opens the system camera, so the in-app camera
   (written because Telegram's Android WebView ignores capture) is Android only. */
export function isIos(): boolean {
  try {
    if (retrieveLaunchParams().tgWebAppPlatform === "ios") {
      return true;
    }
  } catch {
    /* outside Telegram: fall back to the user agent */
  }
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function getTelegramLanguage(): string | undefined {
  try {
    return retrieveLaunchParams().tgWebAppData?.user?.language_code;
  } catch {
    return undefined;
  }
}

export function getTelegramColorScheme(): "light" | "dark" | undefined {
  try {
    if (!insideTelegram) {
      return undefined;
    }
    return miniApp.isDark() ? "dark" : "light";
  } catch {
    return undefined;
  }
}

export function canShareToTelegram(): boolean {
  return insideTelegram && shareURL.isAvailable();
}

/* Opens Telegram's own "send to chat" sheet. Telegram closes the mini app right after. */
export function shareToTelegram(url: string, text?: string): void {
  if (shareURL.isAvailable()) {
    shareURL(url, text);
  }
}

const WRITE_ACCESS_KEY = "bg.botWriteAccess";

/* The notification bot can only DM users who allowed it. Asked once per install: a decline
   is remembered too, so the prompt does not follow the user around. */
export async function ensureBotWriteAccess(): Promise<void> {
  try {
    if (!insideTelegram || localStorage.getItem(WRITE_ACCESS_KEY)) {
      return;
    }
    if (!requestWriteAccess.isAvailable()) {
      return;
    }
    const status = await requestWriteAccess();
    localStorage.setItem(WRITE_ACCESS_KEY, status);
  } catch {
    /* a declined or unsupported request must never break the session */
  }
}

export function closeMiniApp(): void {
  if (miniApp.close.isAvailable()) {
    miniApp.close();
  }
}

export function canUseTelegramBackButton(): boolean {
  try {
    return insideTelegram && backButton.isMounted() && backButton.show.isAvailable();
  } catch {
    return false;
  }
}

export function showBackButton(onClick: () => void): () => void {
  if (!canUseTelegramBackButton()) {
    return () => {};
  }
  backButton.show();
  const off = backButton.onClick(onClick);
  return () => {
    off();
    if (backButton.hide.isAvailable()) {
      backButton.hide();
    }
  };
}
