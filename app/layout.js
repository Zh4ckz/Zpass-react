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

// On api/bots/core/docs.zpas.org the home page is stopped before it renders and the service page is
// loaded into this same document, so the address bar and tab never show internal paths. The literal
// page paths below are replaced with opaque /_next/static URLs by scripts/hide-internal-paths.cjs.
const SUBDOMAIN_ROUTER = `(function(){var u={api:'/subdomain/api/index.html',bots:'/subdomain/bots/index.html',core:'/subdomain/core/index.html',docs:'/subdomain/docs/index.html'};var p={'api.zpas.org':'api','bots.zpas.org':'bots','core.zpas.org':'core','docs.zpas.org':'docs'}[location.hostname.toLowerCase()];if(!p||!/^\\/(index\\.html)?$/.test(location.pathname))return;var r=document.documentElement;r.style.display='none';document.title=p==='docs'?'PassGram Docs':'404';window.__zpSub=p;try{Object.defineProperty(window,'__next_f',{configurable:false,get:function(){throw Error('service page')}})}catch(e){}try{window.stop()}catch(e){}fetch(u[p],{credentials:'same-origin'}).then(function(x){if(!x.ok)throw 0;return x.text()}).then(function(h){var d=new DOMParser().parseFromString(h,'text/html');for(var i=0;i<d.documentElement.attributes.length;i++){var a=d.documentElement.attributes[i];r.setAttribute(a.name,a.value)}r.innerHTML=d.documentElement.innerHTML;r.removeAttribute('style');document.title=d.title;Array.prototype.forEach.call(r.querySelectorAll('script'),function(o){var s=document.createElement('script');for(var j=0;j<o.attributes.length;j++)s.setAttribute(o.attributes[j].name,o.attributes[j].value);if(!o.src)s.textContent=o.textContent;else if(o.type!=='module')s.async=false;o.replaceWith(s)})}).catch(function(){location.replace(u[p]+location.search+location.hash)})})();`

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Runs before anything renders: service subdomains open their own page at once (no home-page flash). */}
        <script dangerouslySetInnerHTML={{ __html: SUBDOMAIN_ROUTER }} />
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