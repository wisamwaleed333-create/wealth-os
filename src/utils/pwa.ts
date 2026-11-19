export type PWAInstallMode =
  | 'hidden'
  | 'native_prompt'
  | 'ios_guide'
  | 'manual_guide';

export function detectIOSDevice(
  userAgent: string,
  maxTouchPoints = 0
): boolean {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return true;
  }
  // iPadOS 13+ reports Macintosh in UA with touch points > 1
  return /macintosh/.test(ua) && maxTouchPoints > 1;
}

export function detectAndroidDevice(userAgent: string): boolean {
  return /android/i.test(userAgent);
}

export function resolveInstallMode(params: {
  isInstalled: boolean;
  hasDeferredPrompt: boolean;
  isIOS: boolean;
}): PWAInstallMode {
  if (params.isInstalled) {
    return 'hidden';
  }
  if (params.hasDeferredPrompt) {
    return 'native_prompt';
  }
  if (params.isIOS) {
    return 'ios_guide';
  }
  return 'manual_guide';
}

export function resolveMobileOpenUrl(
  currentHref: string,
  customOverride?: string
): string {
  const candidate = customOverride?.trim() || currentHref.trim();
  if (!candidate) {
    return '';
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return candidate;
    }

    // In Google AI Studio preview, `ais-dev-*` is a private developer preview frame;
    // `ais-pre-*` is the public shared app URL so anyone scanning the QR opens the app directly.
    const host = parsed.hostname.toLowerCase().startsWith('ais-dev-')
      ? `ais-pre-${parsed.hostname.slice('ais-dev-'.length)}`
      : parsed.hostname;
    const portPart = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.protocol}//${host}${portPart}/?open=app`;
  } catch {
    return candidate;
  }
}

export function isOpenedFromQR(search: string): boolean {
  try {
    return new URLSearchParams(search).get('open') === 'app';
  } catch {
    return false;
  }
}

export function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

export function shouldShowInstallModalOnClick(params: {
  installMode: PWAInstallMode;
  isMobile: boolean;
}): boolean {
  if (params.installMode === 'hidden') {
    return false;
  }
  // On desktop, always show the modal so the mobile QR code is accessible even if native prompt is available.
  if (!params.isMobile) {
    return true;
  }
  return params.installMode !== 'native_prompt';
}


