"use client";

import {
  backButton,
  closingBehavior,
  hapticFeedback,
  initData,
  mainButton,
  miniApp,
  openLink,
  openTelegramLink,
  safeInit,
  shareURL,
  swipeBehavior,
  themeParams,
  viewport,
} from "@tma.js/sdk";

export { backButton, closingBehavior, mainButton };

export interface TelegramClientState {
  available: boolean;
  firstName?: string;
  startParam?: string;
}

let initialized = false;

export async function initializeTelegram(): Promise<TelegramClientState> {
  if (initialized) {
    return { available: true, firstName: initData.user()?.first_name, startParam: initData.startParam() };
  }

  const result = safeInit();
  if (!result.ok) return { available: false };
  initialized = true;

  initData.safeRestore();
  themeParams.mount();
  if (!themeParams.isCssVarsBound()) themeParams.bindCssVars();

  miniApp.mount();
  if (!miniApp.isCssVarsBound()) miniApp.bindCssVars();
  if (miniApp.safeSetHeaderColor.isSupported()) miniApp.safeSetHeaderColor("#fffaf4");
  if (miniApp.safeSetBgColor.isSupported()) miniApp.safeSetBgColor("#fffaf4");
  if (miniApp.safeSetBottomBarColor.isSupported()) miniApp.safeSetBottomBarColor("#fffaf4");
  miniApp.ready();

  const mountedViewport = await viewport.safeMount({ timeout: 1500 });
  if (mountedViewport.ok) {
    if (!viewport.isCssVarsBound()) viewport.bindCssVars();
    viewport.expand();
  }

  if (backButton.isSupported()) backButton.mount();
  if (mainButton.isSupported()) mainButton.mount();
  if (closingBehavior.isSupported()) closingBehavior.mount();
  if (swipeBehavior.isSupported()) {
    swipeBehavior.mount();
    swipeBehavior.enableVertical();
  }

  return { available: true, firstName: initData.user()?.first_name, startParam: initData.startParam() };
}

export function telegramAuthHeaders() {
  return { "X-Telegram-Init-Data": initialized ? (initData.raw() || "") : "" };
}

export function telegramImpact() {
  if (hapticFeedback.isSupported()) hapticFeedback.impactOccurred("medium");
}

export function openExternalLink(url: string) {
  if (initialized && openLink.isSupported()) {
    openLink(url, openLink.supports("tryBrowser") ? { tryBrowser: "chrome" } : undefined);
  }
  else window.location.assign(url);
}

export function shareTelegramURL(url: string, text: string) {
  if (!initialized || !shareURL.isSupported()) return false;
  shareURL(url, text);
  return true;
}

export function openTelegramDeepLink(url: string) {
  if (initialized && openTelegramLink.isSupported()) openTelegramLink(url);
  else window.location.assign(url);
}
