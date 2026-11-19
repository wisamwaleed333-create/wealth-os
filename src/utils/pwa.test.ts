import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectAndroidDevice,
  detectIOSDevice,
  isLocalhostUrl,
  isOpenedFromQR,
  resolveInstallMode,
  resolveMobileOpenUrl,
  shouldShowInstallModalOnClick,
} from './pwa.ts';

test('detectIOSDevice identifies iPhone, iPad, iPod, and touch-enabled iPadOS', () => {
  assert.equal(
    detectIOSDevice(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15'
    ),
    true
  );
  assert.equal(
    detectIOSDevice(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      5
    ),
    true
  );
  assert.equal(
    detectIOSDevice(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      0
    ),
    false
  );
  assert.equal(
    detectIOSDevice(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36'
    ),
    false
  );
});

test('detectAndroidDevice identifies Android user agents cleanly', () => {
  assert.equal(
    detectAndroidDevice(
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/124.0'
    ),
    true
  );
  assert.equal(
    detectAndroidDevice(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)'
    ),
    false
  );
});

test('resolveInstallMode hides prompt when installed and prioritizes native prompt over guides', () => {
  assert.equal(
    resolveInstallMode({
      isInstalled: true,
      hasDeferredPrompt: true,
      isIOS: false,
    }),
    'hidden'
  );
  assert.equal(
    resolveInstallMode({
      isInstalled: false,
      hasDeferredPrompt: true,
      isIOS: false,
    }),
    'native_prompt'
  );
  assert.equal(
    resolveInstallMode({
      isInstalled: false,
      hasDeferredPrompt: false,
      isIOS: true,
    }),
    'ios_guide'
  );
  assert.equal(
    resolveInstallMode({
      isInstalled: false,
      hasDeferredPrompt: false,
      isIOS: false,
    }),
    'manual_guide'
  );
});

test('resolveMobileOpenUrl rewrites ais-dev hosts to public ais-pre shared URL and adds ?open=app', () => {
  assert.equal(
    resolveMobileOpenUrl('https://ais-dev-abc123.europe-west2.run.app/reports'),
    'https://ais-pre-abc123.europe-west2.run.app/?open=app'
  );
  assert.equal(
    resolveMobileOpenUrl('https://wealth.example.com/reports?tab=inflation#top'),
    'https://wealth.example.com/?open=app'
  );
  assert.equal(
    resolveMobileOpenUrl('http://localhost:3000/?foo=bar'),
    'http://localhost:3000/?open=app'
  );
  assert.equal(
    resolveMobileOpenUrl('http://localhost:3000/', 'https://share.example.com/app'),
    'https://share.example.com/?open=app'
  );
  assert.equal(resolveMobileOpenUrl('  '), '');
});

test('isOpenedFromQR detects ?open=app launch query parameter', () => {
  assert.equal(isOpenedFromQR('?open=app'), true);
  assert.equal(isOpenedFromQR('?tab=goals&open=app'), true);
  assert.equal(isOpenedFromQR('?open=web'), false);
  assert.equal(isOpenedFromQR(''), false);
});

test('isLocalhostUrl detects local loopback hosts accurately', () => {
  assert.equal(isLocalhostUrl('http://localhost:3000/?open=app'), true);
  assert.equal(isLocalhostUrl('http://127.0.0.1:3000/?open=app'), true);
  assert.equal(isLocalhostUrl('https://ais-pre-example.run.app/?open=app'), false);
  assert.equal(isLocalhostUrl('http://192.168.1.50:3000/?open=app'), false);
});

test('shouldShowInstallModalOnClick ensures desktop shows QR modal even with native prompt', () => {
  assert.equal(
    shouldShowInstallModalOnClick({ installMode: 'native_prompt', isMobile: false }),
    true
  );
  assert.equal(
    shouldShowInstallModalOnClick({ installMode: 'manual_guide', isMobile: false }),
    true
  );
  assert.equal(
    shouldShowInstallModalOnClick({ installMode: 'native_prompt', isMobile: true }),
    false
  );
  assert.equal(
    shouldShowInstallModalOnClick({ installMode: 'ios_guide', isMobile: true }),
    true
  );
  assert.equal(
    shouldShowInstallModalOnClick({ installMode: 'hidden', isMobile: false }),
    false
  );
});


