/* ══════════════════════════════════════════════
   DOBERMAN — case study interactions
   shared chrome (Lenis/cursor/menu/split) + case scenes
   ══════════════════════════════════════════════ */
(() => {
  "use strict";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ── Lenis handle (instance created after the GSAP guard — the blocks
     between here and the guard are GSAP-free and must survive a CDN failure) ── */
  let lenis = null;
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4, force: true });
    else document.querySelector(target)?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  };

  /* ── Menu overlay (CSS-driven, shared pattern) ─ */
  const menu = document.getElementById("menuOverlay");
  const menuBtn = document.getElementById("menuBtn");
  const menuBtnLabel = menuBtn.querySelector(".menu-btn__label");
  const menuImg = document.getElementById("menuImg");
  const mainEl = document.getElementById("main");
  const headerLogo = document.querySelector(".header__logo");
  const menuBg = menu.querySelector(".menu__bg");
  let menuOpen = false, pendingNav = null, closeTimer = null;

  const finishClose = () => { if (menuOpen) return; lenis?.start(); if (pendingNav) { location.href = pendingNav; } };
  menuBg.addEventListener("transitionend", (e) => { if (e.propertyName === "transform" && !menuOpen) { clearTimeout(closeTimer); finishClose(); } });

  const toggleMenu = (force) => {
    const next = typeof force === "boolean" ? force : !menuOpen;
    if (next === menuOpen) return;
    menuOpen = next;
    document.body.classList.toggle("menu-open", menuOpen);
    menu.classList.toggle("is-open", menuOpen);
    menu.setAttribute("aria-hidden", String(!menuOpen));
    menuBtn.setAttribute("aria-expanded", String(menuOpen));
    menuBtnLabel.textContent = menuOpen ? menuBtnLabel.dataset.close : menuBtnLabel.dataset.open;
    if (menuOpen) {
      pendingNav = null; clearTimeout(closeTimer); lenis?.stop();
      mainEl?.setAttribute("inert", ""); headerLogo?.setAttribute("inert", "");
      menu.querySelector(".menu__link")?.focus({ preventScroll: true });
    } else {
      mainEl?.removeAttribute("inert"); headerLogo?.removeAttribute("inert");
      menuBtn.focus({ preventScroll: true });
      clearTimeout(closeTimer); closeTimer = setTimeout(finishClose, 1200);
    }
  };
  menuBtn.addEventListener("click", () => toggleMenu());
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) toggleMenu(false); });
  addEventListener("keydown", (e) => {
    if (!menuOpen || e.key !== "Tab") return;
    const f = [menuBtn, ...menu.querySelectorAll("a[href]")]; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // menu right-panel crossfade (same two-buffer pattern as home)
  const imgLayers = menuImg.querySelectorAll(".menu__img-layer");
  let imgFront = 0, imgUrl = "";
  const setMenuImage = (url) => {
    if (!url || url === imgUrl || imgLayers.length < 2) return;
    imgUrl = url; const next = 1 - imgFront, inc = imgLayers[next], out = imgLayers[imgFront];
    inc.style.transition = "none"; inc.classList.remove("is-front");
    inc.style.backgroundImage = `url('${url}')`; inc.style.zIndex = "2"; out.style.zIndex = "1";
    void inc.offsetWidth; inc.style.transition = ""; inc.classList.add("is-front"); imgFront = next;
  };
  setMenuImage(menu.querySelector(".menu__link")?.dataset.img);
  menu.querySelectorAll(".menu__link").forEach((link) => {
    link.addEventListener("mouseenter", () => setMenuImage(link.dataset.img));
    link.addEventListener("focus", () => setMenuImage(link.dataset.img));
    // internal (index.html#..) — close menu, then navigate
    link.addEventListener("click", (e) => { e.preventDefault(); pendingNav = link.getAttribute("href"); toggleMenu(false); });
  });

  /* ── Film: the chronicle auto-plays muted inline once in view ── */
  const frame = document.getElementById("filmFrame");
  if (frame && frame.dataset.yt) {
    const yt = frame.dataset.yt;
    if (prefersReduced) {
      // no autoplay — offer a play link over the poster
      frame.style.cursor = "pointer";
      frame.addEventListener("click", () => window.open(`https://www.youtube.com/watch?v=${yt}`, "_blank"));
    } else {
      let loaded = false;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !loaded) {
            loaded = true;
            const iframe = document.createElement("iframe");
            iframe.className = "filmblock__iframe";
            iframe.src = `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&modestbranding=1&playsinline=1&rel=0&disablekb=1`;
            iframe.title = "Хроніка реставрації — Руська Лозова";
            iframe.allow = "autoplay; encrypted-media; picture-in-picture";
            frame.appendChild(iframe);
            frame.classList.add("is-playing");
          }
        });
      }, { threshold: 0.4 });
      io.observe(frame);
    }
  }

  /* ── Anchors ───────────────────────────────── */
  document.querySelector(".chero__scroll")?.addEventListener("click", (e) => { e.preventDefault(); scrollTo("#context"); });
  document.getElementById("toTop")?.addEventListener("click", (e) => { e.preventDefault(); scrollTo("#hero"); });

  /* ── GSAP guard: below this line everything animates ── */
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    document.querySelectorAll("[data-reveal]").forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; });
    document.getElementById("curtain")?.remove();
    // static states for everything the animations would have revealed (see .no-gsap rules in case.css)
    document.documentElement.classList.add("no-gsap");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (prefersReduced) document.documentElement.classList.add("reduced-motion");

  /* ── Lenis ─────────────────────────────────── */
  if (!prefersReduced && typeof Lenis !== "undefined") {
    lenis = new Lenis({ duration: 1.2, smoothWheel: true, wheelMultiplier: 0.85 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ── Split text ────────────────────────────── */
  document.querySelectorAll("[data-split]").forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    text.trim().split(/[ \n\r\t]+/).forEach((word, wi, arr) => {
      const w = document.createElement("span");
      w.className = "word"; w.setAttribute("aria-hidden", "true");
      word.split("").forEach((ch) => {
        const s = document.createElement("span"); s.className = "char"; s.textContent = ch; w.appendChild(s);
      });
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
    const sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = text.trim(); el.appendChild(sr);
  });

  /* ── Curtain + hero intro ──────────────────── */
  const curtain = document.getElementById("curtain");
  if (prefersReduced) {
    curtain?.remove();
    gsap.set(".chero__title .char", { yPercent: 0 });
    gsap.set([".chero__sub", ".chero__meta"], { opacity: 1, y: 0 });
  } else {
    gsap.set(".chero__title .char", { yPercent: 120 });
    gsap.set([".chero__sub", ".chero__meta"], { opacity: 0, y: 24 });
    gsap.set(".chero__img", { scale: 1.16 });
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.to(curtain, { scaleY: 0, duration: 1.1, ease: "expo.inOut", onComplete: () => curtain?.remove() })
      .to(".chero__img", { scale: 1.08, duration: 2.6, ease: "power2.out" }, 0.1)
      .from(".chero__eyebrow", { opacity: 0, y: 18, duration: 1 }, 0.5)
      .to(".chero__title .char", { yPercent: 0, duration: 1.3, stagger: 0.02 }, 0.6)
      .to(".chero__sub", { opacity: 1, y: 0, duration: 1 }, 1.1)
      .to(".chero__meta", { opacity: 1, y: 0, duration: 1 }, 1.3);
  }

  /* ── Custom cursor ─────────────────────────── */
  if (finePointer && !prefersReduced) {
    document.body.classList.add("has-cursor");
    const cursor = document.getElementById("cursor");
    const dot = cursor.querySelector(".cursor__dot");
    const ring = cursor.querySelector(".cursor__ring");
    const label = cursor.querySelector(".cursor__label");
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const rp = { x: pos.x, y: pos.y };
    cursor.style.opacity = "0";
    addEventListener("mousemove", (e) => { pos.x = e.clientX; pos.y = e.clientY; cursor.style.opacity = "1"; }, { passive: true });
    gsap.ticker.add(() => {
      rp.x += (pos.x - rp.x) * 0.16; rp.y += (pos.y - rp.y) * 0.16;
      dot.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rp.x}px,${rp.y}px) translate(-50%,-50%)`;
    });
    document.querySelectorAll("[data-cursor]").forEach((el) => {
      el.addEventListener("mouseenter", () => { label.textContent = el.dataset.cursor; cursor.classList.add("cursor--active"); });
      el.addEventListener("mouseleave", () => cursor.classList.remove("cursor--active"));
    });
  }

  /* ── Magnetic ──────────────────────────────── */
  if (finePointer && !prefersReduced) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const s = 0.25;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * s, y: (e.clientY - (r.top + r.height / 2)) * s, duration: 0.5, ease: "power3.out", overwrite: "auto" });
      });
      el.addEventListener("mouseleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "power4.out", overwrite: "auto" }));
    });
  }

  /* ── Reveals ───────────────────────────────── */
  if (!prefersReduced) {
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
    });
    // lead / quote / cta / ledger / epilogue char rise
    document.querySelectorAll(".chapter__lead, .cquote__text, .case-cta__title .hero__line, .ledger__title, .epilogue__statement").forEach((el) => {
      const chars = el.querySelectorAll(".char"); if (!chars.length) return;
      gsap.fromTo(chars, { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.015, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
    });
  } else {
    document.querySelectorAll("[data-reveal]").forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; });
  }

  /* ── Task limits / epilogue facts: sequenced list builds (per-list trigger) ── */
  if (!prefersReduced) {
    document.querySelectorAll(".chapter__limits").forEach((list) => {
      const items = list.querySelectorAll("li");
      if (items.length) gsap.from(items, {
        y: 28, opacity: 0, duration: .9, ease: "expo.out", stagger: 0.08,
        scrollTrigger: { trigger: list, start: "top 85%" }
      });
    });
  }

  /* ── 03 Ledger: rules draw, sub-items build, sticky ordinal ticks ── */
  const ledgerItems = gsap.utils.toArray(".ledger__item");
  if (ledgerItems.length && !prefersReduced) {
    const ordNums = gsap.utils.toArray(".ledger__ord-num");
    let ordCur = 0;
    gsap.set(ordNums, { opacity: (i) => (i === 0 ? 1 : 0), yPercent: (i) => (i === 0 ? 0 : 28) });
    // masked rise between ordinals — same vocabulary as the char animations
    const setOrd = (idx) => {
      if (idx === ordCur || !ordNums[idx]) return;
      gsap.to(ordNums[ordCur], { yPercent: -28, opacity: 0, duration: .5, ease: "power3.out", overwrite: "auto" });
      gsap.fromTo(ordNums[idx], { yPercent: 28, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .75, ease: "expo.out", overwrite: "auto" });
      ordCur = idx;
    };
    ledgerItems.forEach((item, i) => {
      const rule = item.querySelector(".ledger__rule");
      if (rule) gsap.fromTo(rule, { scaleX: 0 }, {
        scaleX: 1, duration: 1.1, ease: "expo.out",
        scrollTrigger: { trigger: item, start: "top 82%", once: true }
      });
      const subs = item.querySelectorAll(".ledger__sub li");
      if (subs.length) gsap.from(subs, {
        y: 14, opacity: 0, duration: .7, ease: "expo.out", stagger: .07,
        scrollTrigger: { trigger: item, start: "top 74%", once: true }
      });
      ScrollTrigger.create({
        trigger: item, start: "top 55%", end: "bottom 55%",
        onToggle: (self) => { if (self.isActive) setOrd(i); }
      });
    });
  }

  /* ── 04 Method: the copper thread becomes the deadline met ── */
  const methodFlow = document.querySelector(".method__flow");
  if (methodFlow && !prefersReduced) {
    // signature: 1px thread scrubs down the axis, lighting each stage as it passes
    gsap.fromTo("#methodThread", { scaleY: 0 }, {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: methodFlow, start: "top 62%", end: "bottom 55%", scrub: 0.6 }
    });
    gsap.utils.toArray(".method__step:not(.method__step--total)").forEach((step) => {
      // bidirectional ignition — scrolling back un-lights, the line always tells the truth
      ScrollTrigger.create({
        trigger: step, start: "top 60%", end: "bottom 40%",
        toggleClass: { targets: step, className: "is-lit" }
      });
      const chips = step.querySelectorAll(".method__chips li");
      if (chips.length) gsap.from(chips, {
        y: 12, autoAlpha: 0, duration: .6, ease: "expo.out", stagger: .06,
        scrollTrigger: { trigger: step, start: "top 80%", once: true }
      });
    });
    const total = document.querySelector(".method__total");
    if (total) {
      // block rises, digits tick via the shared count-up — no double animation
      gsap.from(total, {
        y: 44, opacity: 0, duration: 1.2, ease: "expo.out",
        scrollTrigger: { trigger: total, start: "top 82%", once: true }
      });
      gsap.fromTo(".method__total-line", { scaleX: 0 }, {
        scaleX: 1, duration: 1.2, ease: "expo.out", delay: .5,
        scrollTrigger: { trigger: total, start: "top 82%", once: true }
      });
    }
  }

  /* ── 05 Epilogue: quiet develop, plate parallax, index build ── */
  const plate = document.querySelector(".epilogue__plate");
  if (plate && !prefersReduced) {
    // the entrance group emerges into light where the copy says keys were handed over
    gsap.fromTo(".epilogue__veil", { opacity: .55 }, {
      opacity: .12, ease: "none",
      scrollTrigger: { trigger: plate, start: "top 85%", end: "bottom 45%", scrub: 0.5 }
    });
    gsap.fromTo(plate.querySelector("img"), { yPercent: -4 }, {
      yPercent: 4, ease: "none",
      scrollTrigger: { trigger: plate, start: "top bottom", end: "bottom top", scrub: true }
    });
  }
  const epIndex = document.querySelector(".epilogue__index");
  if (epIndex && !prefersReduced) {
    const rows = epIndex.querySelectorAll(".epilogue__row");
    gsap.from(rows, {
      y: 26, opacity: 0, duration: .9, ease: "expo.out", stagger: .09,
      scrollTrigger: { trigger: epIndex, start: "top 80%", once: true }
    });
    rows.forEach((row) => {
      const rule = row.querySelector(".epilogue__rule");
      if (rule) gsap.fromTo(rule, { scaleX: 0 }, {
        scaleX: 1, duration: 1, ease: "expo.out",
        scrollTrigger: { trigger: row, start: "top 84%", once: true }
      });
    });
    const badges = document.querySelectorAll(".epilogue__badges li");
    if (badges.length) gsap.from(badges, {
      y: 10, opacity: 0, duration: .6, ease: "expo.out", stagger: .05,
      scrollTrigger: { trigger: ".epilogue__badges", start: "top 90%", once: true }
    });
  }

  /* ── Gallery clip-path reveal ──────────────── */
  if (!prefersReduced) {
    document.querySelectorAll("[data-reveal-img] img").forEach((img) => {
      gsap.to(img, {
        clipPath: "inset(0 0% 0 0)", scale: 1.02, ease: "power2.out", duration: 1.5,
        scrollTrigger: { trigger: img.closest("[data-reveal-img]"), start: "top 82%" }
      });
    });
  } else {
    document.querySelectorAll("[data-reveal-img] img").forEach((im) => { im.style.clipPath = "none"; im.style.transform = "none"; });
  }

  /* ── Count-up (method total + epilogue index) ── */
  document.querySelectorAll(".num__val").forEach((el) => {
    const stat = el.dataset.static;
    // the card carries the reveal (stagger above); the digit only ticks up — no double animation
    if (stat != null) { el.textContent = stat; return; }
    const target = parseFloat(el.dataset.target || "0");
    const suffix = el.dataset.suffix || "";
    if (prefersReduced) { el.textContent = target + suffix; return; }
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: "top 85%", once: true,
      onEnter: () => {
        gsap.to(obj, { v: target, duration: 1.8, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; } });
      }
    });
  });

  /* ── Object reel: horizontal scroll like the homepage rail ── */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
    const track = document.getElementById("reelTrack");
    const pin = document.getElementById("reelPin");
    if (!track || !pin) return;
    const getDist = () => track.scrollWidth - window.innerWidth;
    gsap.to(track, {
      x: () => -getDist(), ease: "none",
      scrollTrigger: {
        trigger: pin, start: "top 14%", end: () => "+=" + getDist() * 1.15,
        pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1
      }
    });
  });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
