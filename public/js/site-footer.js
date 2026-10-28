(function () {
  document.querySelectorAll('body > footer, main footer, footer').forEach(function (f) { f.remove(); });
  var f = document.createElement('footer');
  f.className = 'landing-footer';
  f.innerHTML =
    '<div class="lf-top"><div class="lf-brand"><a class="brand" href="/"><img src="/resources/assets/app-logo/zpass.png" alt="">Z Pass</a>' +
    '<p>Your digital life, in one place.</p>' +
    '<p class="lf-desc">Z Pass is a secure vault for passwords, cards and authenticator codes, synced across Windows, web and Android.</p>' +
    '<div class="lf-social">' +
    '<a href="https://github.com/4rezan" target="_blank" rel="noopener" aria-label="GitHub"><img src="/images/github-mark.svg?v=2" alt=""></a>' +
    '<a href="https://instagram.com/ZizoSoftware" target="_blank" rel="noopener" aria-label="Instagram"><img src="/images/instagram-mark.svg" alt=""></a>' +
    '<a href="https://x.com/ZizoSoftware" target="_blank" rel="noopener" aria-label="X"><img src="/images/x-mark.svg?v=2" alt=""></a>' +
    '<a href="https://t.me/ZizoSoftware" target="_blank" rel="noopener" aria-label="Telegram"><img src="/images/telegram-mark.svg" alt=""></a>' +
    '</div></div><nav class="lf-cols">' +
    '<div><h4>Product</h4><a href="/apps.html">Downloads</a><a href="/2fa.html">Authenticator</a><a href="/aliases.html">Aliases</a></div>' +
    '<div><h4>Account</h4><a href="/dashboard.html#login">Sign in</a><a href="/subscription.html">Subscription</a><a href="/checkout.html">Checkout</a></div>' +
    '<div><h4>Company</h4><a href="/info.html">About</a><a href="/privacy.html">Privacy</a><a href="/security.html">Security</a><a href="/legal/terms.html">Terms</a></div>' +
    '</nav></div><div class="lf-bottom"><span>Copyright &copy; 2026 <b>Z Pass</b></span><span>All rights reserved.</span></div>';
  document.body.appendChild(f);
})();
