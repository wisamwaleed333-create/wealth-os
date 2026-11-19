import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVersionCheckUrl,
  classifyDeploymentOrigin,
  compareSemver,
  compareVersionInfo,
  formatVersionBadge,
  isAppShellCacheName,
  parseSemver,
  parseVersionPayload,
} from './appUpdate.ts';

test('parseSemver and compareSemver compare semantic versions accurately', () => {
  assert.deepEqual(parseSemver('v1.2.3'), [1, 2, 3]);
  assert.deepEqual(parseSemver('2.0'), [2, 0, 0]);
  assert.equal(compareSemver('1.3.0', '1.2.0'), 1);
  assert.equal(compareSemver('1.2.0', '1.2.0'), 0);
  assert.equal(compareSemver('1.1.9', '1.2.0'), -1);
});

test('compareVersionInfo detects newer semver and newer buildId with same semver without false downgrades', () => {
  const current = {
    version: '1.2.0',
    buildId: '1.2.0-20261119060000',
    builtAt: '2026-11-19T06:00:00.000Z',
  };

  assert.deepEqual(
    compareVersionInfo(current, {
      version: '1.3.0',
      buildId: '1.3.0-20261119070000',
      builtAt: '2026-11-19T07:00:00.000Z',
    }),
    { hasUpdate: true, reason: 'version_changed' }
  );

  assert.deepEqual(
    compareVersionInfo(current, {
      version: '1.2.0',
      buildId: '1.2.0-20261119063000',
      builtAt: '2026-11-19T06:30:00.000Z',
    }),
    { hasUpdate: true, reason: 'build_changed' }
  );

  assert.deepEqual(compareVersionInfo(current, current), {
    hasUpdate: false,
    reason: 'up_to_date',
  });

  // Never downgrade to an older build
  assert.deepEqual(
    compareVersionInfo(current, {
      version: '1.1.0',
      buildId: '1.1.0-20261118000000',
      builtAt: '2026-11-18T00:00:00.000Z',
    }),
    { hasUpdate: false, reason: 'up_to_date' }
  );

  assert.deepEqual(
    compareVersionInfo(current, {
      version: '1.2.0',
      buildId: '1.2.0-20261119050000',
      builtAt: '2026-11-19T05:00:00.000Z',
    }),
    { hasUpdate: false, reason: 'up_to_date' }
  );
});

test('parseVersionPayload validates remote version.json objects safely', () => {
  assert.deepEqual(
    parseVersionPayload({
      version: '1.2.1',
      buildId: '1.2.1-build',
      builtAt: '2026-11-19T08:00:00.000Z',
    }),
    {
      version: '1.2.1',
      buildId: '1.2.1-build',
      builtAt: '2026-11-19T08:00:00.000Z',
    }
  );
  assert.equal(parseVersionPayload(null), null);
  assert.equal(parseVersionPayload({ buildId: 'abc' }), null);
});

test('buildVersionCheckUrl and formatVersionBadge produce cache-busted URLs and clean badges', () => {
  assert.equal(
    buildVersionCheckUrl('https://ais-pre-abc.europe-west2.run.app/', 1700000000123.9),
    'https://ais-pre-abc.europe-west2.run.app/version.json?_t=1700000000123'
  );
  assert.equal(formatVersionBadge('1.2.0'), 'v1.2.0');
  assert.equal(formatVersionBadge('v1.2.0'), 'v1.2.0');
});

test('isAppShellCacheName targets only app-shell caches and leaves font caches intact', () => {
  assert.equal(isAppShellCacheName('workbox-precache-v2-https://example.com/'), true);
  assert.equal(isAppShellCacheName('workbox-runtime-https://example.com/'), true);
  assert.equal(isAppShellCacheName('vite-pwa-assets'), true);
  assert.equal(isAppShellCacheName('google-fonts-cache'), false);
  assert.equal(isAppShellCacheName('gstatic-fonts-cache'), false);
  assert.equal(isAppShellCacheName('user-private-db'), false);
});

test('classifyDeploymentOrigin identifies AI Studio dev vs shared production URLs', () => {
  assert.deepEqual(
    classifyDeploymentOrigin(
      'https://ais-dev-abc123.europe-west2.run.app/reports'
    ),
    {
      origin: 'https://ais-dev-abc123.europe-west2.run.app',
      hostname: 'ais-dev-abc123.europe-west2.run.app',
      channel: 'ai_studio_dev',
      canonicalProductionUrl: 'https://ais-pre-abc123.europe-west2.run.app',
    }
  );

  assert.deepEqual(
    classifyDeploymentOrigin(
      'https://ais-pre-abc123.europe-west2.run.app/?open=app'
    ),
    {
      origin: 'https://ais-pre-abc123.europe-west2.run.app',
      hostname: 'ais-pre-abc123.europe-west2.run.app',
      channel: 'ai_studio_shared',
      canonicalProductionUrl: 'https://ais-pre-abc123.europe-west2.run.app',
    }
  );

  assert.equal(
    classifyDeploymentOrigin('http://localhost:3000/').channel,
    'localhost'
  );
  assert.equal(
    classifyDeploymentOrigin('https://wealthos.app/').channel,
    'production'
  );
});
