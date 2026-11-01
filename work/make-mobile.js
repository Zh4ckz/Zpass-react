const fs = require('fs'), path = require('path');
const SRC = 'C:/Users/rezan/Desktop/UI/index.html';
const OUT = path.join(__dirname, '..', 'mobile');
let html = fs.readFileSync(SRC, 'utf8');

const style = html.match(/<style>([\s\S]*?)<\/style>/);
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!style || scripts.length !== 2) throw new Error('unexpected layout');

html = html.replace(style[0], '<link rel="stylesheet" href="/resources/css/mobile.css">');
html = html.replace(scripts[0][0], '<script src="/resources/js/classic/mobile-app.js"></script>');
html = html.replace(scripts[1][0], '');

const a = html.indexOf('<!-- ═══ LOGIN ═══ -->');
const b = html.indexOf('<!-- ═══ HOME / SECURITY DASHBOARD ═══ -->');
if (a < 0 || b < 0) throw new Error('login markers');
html = html.slice(0, a) + html.slice(b);
html = html.replace('<title>Z Pass — V12</title>', '<title>PassGram</title>');
html = html.replace(/<body class="[^"]*"/, '<body class="h-screen w-screen overflow-hidden relative"');

const css = style[1] + `
/* PassGram Web: full-screen mobile layout */
body { display: block !important; background: #f4f4f1 !important; }
body > .absolute.inset-0 { display: none !important; }
#phone { width: 100vw !important; height: 100dvh !important; max-height: none !important; border-radius: 0 !important; padding: 0 !important; box-shadow: none !important; background: transparent !important; }
#phone > div { border-radius: 0 !important; padding-bottom: env(safe-area-inset-bottom); }
#phone > div > div:first-child { display: none !important; }
`;

let js = scripts[0][1] + '\n' + scripts[1][1];
const before = js;
js = js.replace(/'Tom \(You\)'/g, "(ME_USER.name + ' (You)')");
js = js.replace(/function drawerLogout\(\) \{[^\n]*\}/, "function drawerLogout() { closeDrawer(); try { parent.postMessage({ type: 'zpass-signout' }, location.origin); } catch (e) {} }");
const tail = "setLang('en');";
if (!js.includes(tail)) throw new Error('setLang tail');
js = js.replace(tail, `(function () {
    const P = new URLSearchParams(location.search);
    const l = P.get('lang');
    if (P.get('n')) { ME_USER.name = ME_USER.firstName = P.get('n'); }
    if (P.get('u')) { ME_USER.username = '@' + P.get('u'); }
    window.__bootLang = I18N[l] ? l : 'en';
})();
setLang(window.__bootLang);`);
js = js.replace(/switchScreen\('screen-login'\);\s*$/, 'enterApp();\n');
if (js === before || !js.includes('enterApp();')) throw new Error('js patch');
js = "if (window.top === window) { location.replace('/web'); }\n" + js;

fs.mkdirSync(path.join(OUT, 'css'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'js', 'classic'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'mobile.html'), html);
fs.writeFileSync(path.join(OUT, 'css', 'mobile.css'), css);
fs.writeFileSync(path.join(OUT, 'js', 'classic', 'mobile-app.js'), js);
console.log('ok', html.length, css.length, js.length);
