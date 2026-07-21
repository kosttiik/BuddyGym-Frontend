import {
  backButton,
  init,
  miniApp,
  retrieveLaunchParams,
  retrieveRawInitData,
  shareURL,
  swipeBehavior,
  themeParams,
  viewport,
} from "@telegram-apps/sdk-react";

let insideTelegram = false;

type TelegramLocation = {
  latitude: number;
  longitude: number;
  horizontal_accuracy?: number;
};

type TelegramLocationManager = {
  isInited: boolean;
  isLocationAvailable: boolean;
  init: (callback?: () => void) => TelegramLocationManager;
  getLocation: (callback: (location: TelegramLocation | null) => void) => TelegramLocationManager;
};

type TelegramWebApp = {
  LocationManager?: TelegramLocationManager;
};

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

export function getTelegramLocation(): Promise<{
  lat: number;
  lon: number;
  horizontal_accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    const webApp = (window as Window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
    const manager = webApp?.LocationManager;
    if (!manager) {
      reject(new Error("Telegram location manager is unavailable"));
      return;
    }

    const readLocation = () => {
      if (!manager.isLocationAvailable) {
        reject(new Error("Telegram location is unavailable"));
        return;
      }
      manager.getLocation((location) => {
        const accuracy = location?.horizontal_accuracy;
        if (!location || accuracy === undefined || !Number.isFinite(accuracy) || accuracy <= 0) {
          reject(new Error("Telegram location accuracy is unavailable"));
          return;
        }
        resolve({
          lat: location.latitude,
          lon: location.longitude,
          horizontal_accuracy: accuracy,
        });
      });
    };

    try {
      if (manager.isInited) {
        readLocation();
      } else {
        manager.init(readLocation);
      }
    } catch (error) {
      reject(error);
    }
  });
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
