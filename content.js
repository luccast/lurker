(() => {
  let untracked = null; // null = unknown yet
  let mode = false;

  browser.storage.local.get({ mode: false }).then((s) => { mode = s.mode; });
  browser.storage.onChanged.addListener((ch) => { if (ch.mode) mode = ch.mode.newValue; });

  browser.runtime.sendMessage({ type: "whoami" }).then((r) => {
    untracked = r.untracked;
    if (untracked) showPill(); else initHover();
  });

  const open = (url, active = true) => browser.runtime.sendMessage({ type: "open", url, active });

  const videoLink = (el) => {
    const a = el?.closest?.("a[href]");
    return a && lurkerVideoId(a.href) ? a : null;
  };

  // ---------- click interception (signed-in tabs only) ----------

  function onClick(e) {
    if (untracked !== false) return;
    if (e.button > 1) return;
    const a = videoLink(e.target);
    if (!a) return;
    const bg = e.button === 1 || e.ctrlKey || e.metaKey;
    if (!(e.altKey || mode)) return;
    if (e.button === 1 && !mode) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open(a.href, !bg);
  }
  window.addEventListener("click", onClick, true);
  window.addEventListener("auxclick", onClick, true);

  // ---------- hover button ----------

  const EYE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.7 5.1A10.8 10.8 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.7"/><path d="M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m2 2 20 20"/></svg>`;

  const eyeIcon = () => new DOMParser().parseFromString(EYE, "image/svg+xml").documentElement;

  function initHover() {
    const btn = document.createElement("button");
    btn.className = "lurker-btn";
    btn.title = "Watch untracked (Lurker)";
    btn.setAttribute("aria-label", "Watch untracked");
    btn.append(eyeIcon());
    let target = null;
    let hideT = null;

    const hide = () => { btn.classList.remove("lurker-show"); target = null; rect = null; };
    const hideSoon = () => { clearTimeout(hideT); hideT = setTimeout(hide, 120); };

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (target) open(target.href, !(e.ctrlKey || e.metaKey));
      hide();
    }, true);
    btn.addEventListener("auxclick", (e) => {
      if (e.button !== 1) return;
      e.preventDefault();
      if (target) open(target.href, false);
    }, true);

    // Rect of the thumbnail the button belongs to. YouTube's hover preview player
    // covers the thumbnail with an element outside the link, so we keep the button
    // while the pointer stays inside this rect, regardless of what's under it.
    let rect = null;
    const inside = (x, y) => rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

    document.addEventListener("mouseover", (e) => {
      if (btn.contains(e.target)) { clearTimeout(hideT); return; }
      const a = videoLink(e.target);
      const thumb = a && a.querySelector("img, yt-image, yt-thumbnail-view-model");
      const r = thumb && a.getBoundingClientRect();
      if (!r || r.width < 100 || r.height < 50) {
        if (inside(e.clientX, e.clientY)) { clearTimeout(hideT); return; }
        return hideSoon();
      }
      clearTimeout(hideT);
      target = { href: a.href };
      rect = r;
      btn.style.top = `${r.top + 8}px`;
      btn.style.left = `${r.left + 8}px`;
      btn.classList.add("lurker-show");
    }, true);

    // The preview player doesn't fire new mouseovers as you move across it, so
    // also watch pointer movement to hide once you leave the thumbnail.
    document.addEventListener("mousemove", (e) => {
      if (target && !inside(e.clientX, e.clientY) && !btn.contains(e.target)) hideSoon();
    }, { passive: true, capture: true });
    window.addEventListener("scroll", hide, { passive: true, capture: true });

    const mount = () => document.body ? document.body.append(btn) : requestAnimationFrame(mount);
    mount();
  }

  // ---------- pill in untracked tabs ----------

  function showPill() {
    const pill = document.createElement("div");
    pill.className = "lurker-pill";
    const label = document.createElement("span");
    label.textContent = "Lurking · signed out · closes clean";
    const x = document.createElement("button");
    x.setAttribute("aria-label", "Dismiss");
    x.textContent = "×";
    x.onclick = () => pill.remove();
    pill.append(eyeIcon(), label, x);
    const mount = () => document.body ? document.body.append(pill) : requestAnimationFrame(mount);
    mount();
  }
})();
