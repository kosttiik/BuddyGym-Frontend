import {
  backButton,
  init,
  miniApp,
  retrieveLaunchParams,
  retrieveRawInitData,
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

export function closeMiniApp(): void {
  if (miniApp.close.isAvailable()) {
    miniApp.close();
  }
}

export function showBackButton(onClick: () => void): () => void {
  if (!insideTelegram || !backButton.show.isAvailable()) {
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
