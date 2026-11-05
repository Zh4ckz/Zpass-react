export const metadata = {
  title: 'PassGram — Your digital life, in one private space',
  description: 'PassGram keeps passwords, passkeys and authenticator codes together across Android, Windows and web.',
  icons: {
    icon: [
      { url: '/resources/img/favicon.ico?v=1' },
      { url: '/resources/assets/app-logo/zpass.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/resources/assets/app-logo/zpass.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="/resources/js/pay-host.js?v=3" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,400;1,14..32,500&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/resources/css/marketing-2026.css?v=7" />
        <link rel="stylesheet" href="/resources/css/modern-2026.css?v=20" />
        <link rel="stylesheet" href="/resources/css/glass-header.css?v=2" />
        <link rel="stylesheet" href="/resources/css/home-refresh.css?v=2" />
      </head>
      <body>{children}</body>
    </html>
  )
}