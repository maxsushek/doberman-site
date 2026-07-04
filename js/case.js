/* ══════════════════════════════════════════════
   DOBERMAN — case study interactions
   shared chrome (Lenis/cursor/menu/split) + case scenes
   ══════════════════════════════════════════════ */
(() => {
  "use strict";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    document.querySelectorAll("[data-reveal]").forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; });
    document.getElementById("curtain")?.remove();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (prefersReduced) document.documentElement.classList.add("reduced-motion");

  /* ── Lenis ─────────────────────────────────── */
  let lenis = null;
  if (!prefersReduced && typeof Lenis !== "undefined") {
    lenis = new Lenis({ duration: 1.2, smoothWheel: true, wheelMultiplier: 0.85 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4, force: true });
    else document.querySelector(target)?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  };

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

  /* ── Reveals ───────────────────────────────── */
  if (!prefersReduced) {
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
    });
    // lead / cta char rise
    document.querySelectorAll(".chapter__lead, .case-cta__title .hero__line").forEach((el) => {
      const chars = el.querySelectorAll(".char"); if (!chars.length) return;
      gsap.fromTo(chars, { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.015, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
    });
  } else {
    document.querySelectorAll("[data-reveal]").forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; });
  }

  /* ── Solution diagram draw ─────────────────── */
  if (!prefersReduced) {
    ScrollTrigger.create({
      trigger: ".solution__diagram", start: "top 75%", once: true,
      onEnter: () => {
        gsap.to(".dgm-line path", { strokeDashoffset: 0, duration: 1.4, stagger: 0.12, ease: "power2.out" });
        gsap.to(".dgm-node, .dgm-house, .dgm-label text", { opacity: 1, duration: 0.8, stagger: 0.05, ease: "power2.out", delay: 0.5 });
      }
    });
  }

  /* ── Process stages: clip-path reveal + parallax ─ */
  if (!prefersReduced) {
    document.querySelectorAll(".stage").forEach((stage) => {
      const img = stage.querySelector(".stage__media img");
      gsap.to(img, {
        clipPath: "inset(0% 0% 0% 0%)", ease: "none",
        scrollTrigger: { trigger: stage, start: "top 85%", end: "top 35%", scrub: true }
      });
      gsap.fromTo(img, { yPercent: -8 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: stage, start: "top bottom", end: "bottom top", scrub: true }
      });
      const cap = stage.querySelector(".stage__cap");
      gsap.from(cap, { y: 40, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: stage, start: "top 60%" } });
    });
  } else {
    document.querySelectorAll(".stage__media img").forEach((im) => { im.style.clipPath = "none"; im.style.transform = "none"; });
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

  /* ── Result: count-up ──────────────────────── */
  document.querySelectorAll(".num__val").forEach((el) => {
    const stat = el.dataset.static;
    if (stat != null) { el.textContent = stat; if (!prefersReduced) gsap.from(el, { opacity: 0, y: 26, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } }); return; }
    const target = parseFloat(el.dataset.target || "0");
    const suffix = el.dataset.suffix || "";
    if (prefersReduced) { el.textContent = target + suffix; return; }
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: "top 85%", once: true,
      onEnter: () => {
        gsap.fromTo(el, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1, ease: "expo.out" });
        gsap.to(obj, { v: target, duration: 1.8, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; } });
      }
    });
  });

  /* ── Film block: play on click ─────────────── */
  const frame = document.getElementById("filmFrame");
  const video = document.getElementById("caseVideo");
  if (frame && video) {
    frame.addEventListener("click", () => {
      if (frame.classList.contains("is-playing")) { video.pause(); frame.classList.remove("is-playing"); }
      else { video.play().catch(() => {}); frame.classList.add("is-playing"); }
    });
  }

  /* ── Anchors ───────────────────────────────── */
  document.querySelector(".chero__scroll")?.addEventListener("click", (e) => { e.preventDefault(); scrollTo("#context"); });
  document.getElementById("toTop")?.addEventListener("click", (e) => { e.preventDefault(); scrollTo("#hero"); });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
