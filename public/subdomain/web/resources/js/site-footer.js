(function () {
  document.querySelectorAll('body > footer, main footer, footer').forEach(function (f) { f.remove(); });
  var f = document.createElement('footer');
  f.className = 'landing-footer';
  f.innerHTML =
    '<div class="lf-top"><div class="lf-brand"><a class="brand" href="https://zpas.org/"><img src="/resources/assets/app-logo/zpass.png" alt="">PassGram</a>' +
    '<p>Your digital life, in one place.</p>' +
    '<p class="lf-desc">PassGram is a secure vault for passwords, cards and authenticator codes, synced across Windows, web and Android.</p>' +
    '<div class="lf-social">' +
    '<a href="https://github.com/4rezan" target="_blank" rel="noopener" aria-label="GitHub"><img src="/resources/images/github-mark.svg?v=2" alt=""></a>' +
    '<a href="https://instagram.com/ZizoSoftware" target="_blank" rel="noopener" aria-label="Instagram"><img src="/resources/images/instagram-mark.svg" alt=""></a>' +
    '<a href="https://x.com/ZizoSoftware" target="_blank" rel="noopener" aria-label="X"><img src="/resources/images/x-mark.svg?v=2" alt=""></a>' +
    '<a href="https://t.me/ZizoSoftware" target="_blank" rel="noopener" aria-label="Telegram"><img src="/resources/images/telegram-mark.svg" alt=""></a>' +
    '</div></div><nav class="lf-cols">' +
    '<div><h4>Product</h4><a href="https://zpas.org/apps">Downloads</a><a href="https://zpas.org/2fa">Authenticator</a></div>' +
    '<div><h4>Account</h4><a href="https://zpas.org/subscription">Subscription</a><a href="https://pay.zpas.org/">Checkout</a></div>' +
    '<div><h4>Company</h4><a href="https://zpas.org/info">About</a><a href="https://zpas.org/legal/privacy">Privacy</a><a href="https://zpas.org/legal/security">Security</a><a href="https://zpas.org/legal/terms">Terms</a></div>' +
    '</nav></div><div class="lf-bottom"><span>Copyright &copy; 2026 <b>PassGram</b></span><span>All rights reserved.</span></div>';
  document.body.appendChild(f);
})();
