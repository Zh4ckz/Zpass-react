// Where each service page (api/bots/core/docs/pay/web) is served.
// Production: opaque URLs created by scripts/hide-internal-paths.cjs (it fails the build if these drift).
// Development (`next dev`): the readable public/subdomain folders.
// Next-compiled code must never contain the folder paths, because the post-build step does not
// (and must not) rewrite Next's own output: its RSC payload stores string lengths.
const PRODUCTION = {
  api: '/_next/static/chunks/3bd42b31dc4e8baa',
  bots: '/_next/static/chunks/9ea25a6d1a75fb7f',
  core: '/_next/static/chunks/002be71fd211d7a8',
  docs: '/_next/static/chunks/870481d7be0ce118',
  pay: '/_next/static/chunks/e6dd7c91fbc053a6',
}

const DEVELOPMENT = Object.fromEntries(Object.keys(PRODUCTION).map((s) => [s, ['', 'subdomain', s, 'index.html'].join('/')]))

export const SERVICE_PAGES = process.env.NODE_ENV === 'production' ? PRODUCTION : DEVELOPMENT
