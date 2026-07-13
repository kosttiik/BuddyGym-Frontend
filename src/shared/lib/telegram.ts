import {
  backButton,
  init,
  miniApp,
  readTextFromClipboard,
  retrieveLaunchParams,
  retrieveRawInitData,
  shareURL,
  swipeBehavior,
  themeParams,
  viewport,
} from "@telegram-apps/sdk-react";

let insideTelegram = false;

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

export function getStartParam(): string | undefined {
  try {
    return retrieveLaunchParams().tgWebAppStartParam;
  } catch {
    return undefined;
  }
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

/* navigator.clipboard.readText is blocked inside Telegram's WebView; the SDK asks the
   client for the clipboard instead. */
export async function readClipboard(): Promise<string> {
  try {
    if (insideTelegram && readTextFromClipboard.isAvailable()) {
      return (await readTextFromClipboard()) ?? "";
    }
  } catch {
    /* fall through to the browser API */
  }
  try {
    return await navigator.clipboard.readText();
  } catch {
    return "";
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
