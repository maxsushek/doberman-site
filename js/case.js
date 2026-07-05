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
  document.querySelector(".chero__scroll")?.addEventListener("click", (e) => { e.preventDefault(); scrollTo("#story"); });
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

  /* ── Reveals (generic + CTA char rise) ─────── */
  if (!prefersReduced) {
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
    });
    document.querySelectorAll(".case-cta__title .hero__line, .tstory__lead, .tstory__statement, .tstory__quote, .team__title").forEach((el) => {
      const chars = el.querySelectorAll(".char"); if (!chars.length) return;
      gsap.fromTo(chars, { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.015, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
    });
  } else {
    document.querySelectorAll("[data-reveal]").forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; });
  }

  /* ── Story film: a pinned cinematic sequence of scroll-driven shots ──
     Desktop + motion = the "mini-film"; mobile / reduced-motion stays a clean
     vertical stack (handled by CSS + the stack reveals below). */
  const filmSeq = document.querySelector(".film-seq");
  if (filmSeq && !prefersReduced) {
    const mmFilm = gsap.matchMedia();
    // ── pinned film (desktop) ──
    mmFilm.add("(min-width: 901px)", () => {
      filmSeq.classList.add("is-film");
      const shots = gsap.utils.toArray(".film-seq .shot");
      const [, s2, s3] = shots;   // 01 intro (base) · 02 task · 03 result (цифри + підсумок)
      const idxEl = document.getElementById("filmIdx");
      const barEl = document.getElementById("filmBar");

      // dim photo shots stacked off-screen: task waits right, result waits below
      gsap.set(s2, { xPercent: 100 });
      gsap.set(s3, { yPercent: 100 });

      // ── per-shot text reveal (played at a designed speed = the WOW; decoupled from scrub) ──
      const buildText = (shot) => {
        const t = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
        const chars = shot.querySelectorAll(".shot__title .char");
        const rest = shot.querySelectorAll(".shot__cap, .shot__lead, .shot__client, .stat");
        if (chars.length) { gsap.set(chars, { yPercent: 130 }); t.to(chars, { yPercent: 0, duration: 0.9, stagger: 0.026 }, 0); }
        if (rest.length) { gsap.set(rest, { y: 26, autoAlpha: 0 }); t.to(rest, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.07 }, 0.18); }
        return t;
      };
      const textTls = shots.map(buildText);

      // intro text assembles as the film scrolls into view (before the pin engages)
      ScrollTrigger.create({
        trigger: filmSeq, start: "top 55%",
        onEnter: () => textTls[0].play(), onLeaveBack: () => textTls[0].reverse()
      });

      // progress at which each shot has landed → its text plays; scrolling back reverses it
      const reveals = [0, 0.42, 0.80];
      let active = 0;
      const master = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: filmSeq, start: "top top", end: "bottom bottom",
          scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (barEl) barEl.style.width = (self.progress * 100).toFixed(1) + "%";
            let idx = 0; for (let i = 0; i < reveals.length; i++) if (self.progress >= reveals[i]) idx = i;
            if (idxEl) idxEl.textContent = String(idx + 1).padStart(2, "0");
            if (idx !== active) {
              for (let j = 1; j < textTls.length; j++) { if (j <= idx) textTls[j].play(); else textTls[j].reverse(); }
              active = idx;
            }
          }
        }
      });
      master.to({}, { duration: 0.9 });              // hold 01
      master.to(s2, { xPercent: 0, duration: 1 });   // 02 slides in from the right
      master.to({}, { duration: 0.9 });              // hold 02
      master.to(s3, { yPercent: 0, duration: 1 });   // 03 rises — the payoff (numbers + summary)
      master.to({}, { duration: 0.9 });              // end hold

      return () => { filmSeq.classList.remove("is-film"); };  // revert on resize to mobile
    });
    // ── stacked reveals (mobile) ──
    mmFilm.add("(max-width: 900px)", () => {
      gsap.utils.toArray(".film-seq .shot__content").forEach((el) => {
        gsap.from(el, {
          y: 30, autoAlpha: 0, duration: 0.9, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true }
        });
      });
    });
  }

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
        // higher priority → this pin refreshes first, so its spacer is in place
        // before the film sequence below measures its own scroll positions
        pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1, refreshPriority: 1
      }
    });
  });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
