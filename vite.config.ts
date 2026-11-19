import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const NO_CACHE_PATHS = new Set([
  '/version.json',
  '/sw.js',
  '/dev-sw.js',
  '/manifest.webmanifest',
  '/',
  '/index.html',
]);

function readPackageVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, 'package.json');
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const parsed = JSON.parse(raw) as {version?: string};
    return parsed.version?.trim() || '1.2.0';
  } catch {
    return '1.2.0';
  }
}

function wealthVersionManifestPlugin(payload: {
  name: string;
  displayName: string;
  version: string;
  buildId: string;
  builtAt: string;
}): Plugin {
  const serialized = JSON.stringify(payload, null, 2);

  const applyNoCacheHeaders = (
    reqUrl: string | undefined,
    setHeader: (name: string, value: string) => void
  ) => {
    const pathname = (reqUrl || '/').split('?')[0];
    if (
      NO_CACHE_PATHS.has(pathname) ||
      pathname.endsWith('.html') ||
      pathname.startsWith('/workbox-')
    ) {
      setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      setHeader('Pragma', 'no-cache');
      setHeader('Expires', '0');
    }
  };

  return {
    name: 'wealth-version-manifest',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '/').split('?')[0];
        applyNoCacheHeaders(req.url, (k, v) => res.setHeader(k, v));

        if (pathname === '/version.json') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(serialized);
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        applyNoCacheHeaders(req.url, (k, v) => res.setHeader(k, v));
        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: serialized,
      });
    },
  };
}

export default defineConfig(() => {
  const appVersion = readPackageVersion();
  const builtAt = new Date().toISOString();
  const buildId = `${appVersion}-${builtAt.replace(/[-:TZ.]/g, '').slice(0, 14)}`;

  const versionPayload = {
    name: 'WEALTH OS',
    displayName: 'نظام بناء الثروة',
    version: appVersion,
    buildId,
    builtAt,
  };

  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_BUILD_ID__: JSON.stringify(buildId),
      __APP_BUILD_TIME__: JSON.stringify(builtAt),
    },
    plugins: [
      react(),
      tailwindcss(),
      wealthVersionManifestPlugin(versionPayload),
      VitePWA({
        registerType: 'prompt',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'نظام بناء الثروة',
          short_name: 'بناء الثروة',
          description:
            'نظام احترافي لإدارة الأموال الشخصية، الأصول، الالتزامات، الاستثمارات، وبناء الثروة باللغة العربية.',
          dir: 'rtl',
          lang: 'ar',
          theme_color: '#0B1526',
          background_color: '#060C18',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          launch_handler: {
            client_mode: ['focus-existing', 'auto'],
          },
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest}'],
          globIgnores: ['**/version.json'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/version\.json/,
            /^\/sw\.js/,
            /^\/manifest\.webmanifest/,
          ],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /\/version\.json(\?.*)?$/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\/api\//i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
