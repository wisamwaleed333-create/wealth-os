export interface AppVersionInfo {
  version: string;
  buildId: string;
  builtAt: string;
}

export type VersionComparisonReason =
  | 'version_changed'
  | 'build_changed'
  | 'up_to_date';

export interface VersionComparisonResult {
  hasUpdate: boolean;
  reason: VersionComparisonReason;
}

export type DeploymentChannel =
  | 'ai_studio_dev'
  | 'ai_studio_shared'
  | 'localhost'
  | 'production';

export interface DeploymentOriginInfo {
  origin: string;
  hostname: string;
  channel: DeploymentChannel;
  canonicalProductionUrl: string;
}

export function parseSemver(version: string): [number, number, number] {
  const cleaned = version.trim().replace(/^v/i, '').split('-')[0];
  const parts = cleaned.split('.').map((p) => {
    const n = Number.parseInt(p, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export function compareVersionInfo(
  current: AppVersionInfo,
  remote: AppVersionInfo
): VersionComparisonResult {
  const semverDiff = compareSemver(remote.version, current.version);
  if (semverDiff > 0) {
    return { hasUpdate: true, reason: 'version_changed' };
  }
  if (semverDiff < 0) {
    return { hasUpdate: false, reason: 'up_to_date' };
  }

  const remoteBuild = remote.buildId.trim();
  const currentBuild = current.buildId.trim();
  if (remoteBuild && currentBuild && remoteBuild !== currentBuild) {
    const remoteTime = Date.parse(remote.builtAt);
    const currentTime = Date.parse(current.builtAt);
    if (Number.isFinite(remoteTime) && Number.isFinite(currentTime)) {
      if (remoteTime > currentTime) {
        return { hasUpdate: true, reason: 'build_changed' };
      }
      return { hasUpdate: false, reason: 'up_to_date' };
    }
    return { hasUpdate: true, reason: 'build_changed' };
  }

  return { hasUpdate: false, reason: 'up_to_date' };
}

export function parseVersionPayload(raw: unknown): AppVersionInfo | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const version =
    typeof candidate.version === 'string' ? candidate.version.trim() : '';
  const buildId =
    typeof candidate.buildId === 'string' ? candidate.buildId.trim() : '';
  const builtAt =
    typeof candidate.builtAt === 'string' ? candidate.builtAt.trim() : '';

  if (!version) {
    return null;
  }

  return {
    version,
    buildId: buildId || version,
    builtAt,
  };
}

export function buildVersionCheckUrl(origin: string, timestamp: number): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  return `${cleanOrigin}/version.json?_t=${Math.floor(timestamp)}`;
}

export function formatVersionBadge(version: string): string {
  const clean = version.trim().replace(/^v/i, '');
  return clean ? `v${clean}` : 'v1.0.0';
}

export function isAppShellCacheName(cacheName: string): boolean {
  const lower = cacheName.toLowerCase();
  if (lower.includes('fonts-cache')) {
    return false;
  }
  return (
    lower.includes('workbox-precache') ||
    lower.includes('workbox-runtime') ||
    lower.includes('vite-pwa') ||
    lower.includes('wealth-os')
  );
}

export function classifyDeploymentOrigin(href: string): DeploymentOriginInfo {
  try {
    const parsed = new URL(href);
    const hostname = parsed.hostname.toLowerCase();
    const portPart = parsed.port ? `:${parsed.port}` : '';
    const origin = `${parsed.protocol}//${parsed.hostname}${portPart}`;

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1'
    ) {
      return {
        origin,
        hostname,
        channel: 'localhost',
        canonicalProductionUrl: origin,
      };
    }

    if (hostname.startsWith('ais-dev-')) {
      const sharedHost = `ais-pre-${parsed.hostname.slice('ais-dev-'.length)}`;
      return {
        origin,
        hostname,
        channel: 'ai_studio_dev',
        canonicalProductionUrl: `${parsed.protocol}//${sharedHost}${portPart}`,
      };
    }

    if (hostname.startsWith('ais-pre-')) {
      return {
        origin,
        hostname,
        channel: 'ai_studio_shared',
        canonicalProductionUrl: origin,
      };
    }

    return {
      origin,
      hostname,
      channel: 'production',
      canonicalProductionUrl: origin,
    };
  } catch {
    return {
      origin: '',
      hostname: '',
      channel: 'production',
      canonicalProductionUrl: '',
    };
  }
}
