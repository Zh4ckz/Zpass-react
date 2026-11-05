(() => {
  let bubble, timer;
  const text = (el) => {
    if (el.validity.valueMissing) return "Please fill out this field";
    if (el.validity.typeMismatch && el.type === "email") return "Enter a valid email address";
    if (el.validity.tooShort) return `Use at least ${el.minLength} characters`;
    return el.validationMessage || "Check this field";
  };
  const show = (el) => {
    bubble?.remove();
    clearTimeout(timer);
    bubble = document.createElement("div");
    bubble.className = "zp-invalid-tip";
    bubble.setAttribute("role", "alert");
    bubble.innerHTML = '<span>!</span><b></b>';
    bubble.querySelector("b").textContent = text(el);
    document.body.appendChild(bubble);
    const r = el.getBoundingClientRect();
    const w = bubble.offsetWidth;
    const left = Math.max(10, Math.min(innerWidth - w - 10, r.left));
    const top = r.bottom + 10 + bubble.offsetHeight > innerHeight ? r.top - bubble.offsetHeight - 10 : r.bottom + 10;
    bubble.style.left = left + "px";
    bubble.style.top = top + "px";
    bubble.style.setProperty("--arrow", Math.max(16, Math.min(w - 24, r.left + 22 - left)) + "px");
    requestAnimationFrame(() => bubble.classList.add("on"));
    timer = setTimeout(hide, 3200);
  };
  const hide = () => {
    if (!bubble) return;
    const b = bubble;
    bubble = null;
    b.classList.remove("on");
    setTimeout(() => b.remove(), 200);
  };
  document.addEventListener("invalid", (e) => {
    e.preventDefault();
    const el = e.target;
    el.classList.add("zp-invalid");
    if (!bubble) show(el);
  }, true);
  document.addEventListener("input", (e) => {
    e.target.classList?.remove("zp-invalid");
    hide();
  }, true);
})();
