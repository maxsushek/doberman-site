/* ══════════════════════════════════════════════
   DOBERMAN — interaction & scroll direction
   GSAP + ScrollTrigger + Lenis
   ══════════════════════════════════════════════ */
(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  // CDN failure guard: never leave the page locked behind the preloader
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    document.documentElement.classList.add("no-js");
    const pl = document.getElementById("preloader");
    if (pl) pl.style.display = "none";
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  if (prefersReduced) document.documentElement.classList.add("reduced-motion");

  /* ── Lenis smooth scroll ─────────────────── */
  let lenis = null;
  if (!prefersReduced && typeof Lenis !== "undefined") {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4, force: true });
    else document.querySelector(target)?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  };

  /* ── Split text into chars ───────────────── */
  document.querySelectorAll("[data-split]").forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    // split on regular whitespace only: nbsp keeps word pairs glued
    text.trim().split(/[ \n\r\t]+/).forEach((word, wi, arr) => {
      const w = document.createElement("span");
      w.className = "word";
      w.setAttribute("aria-hidden", "true");
      word.split("").forEach((ch) => {
        const s = document.createElement("span");
        s.className = "char";
        s.textContent = ch;
        w.appendChild(s);
      });
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
    // accessible copy: visible chars are aria-hidden word by word
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = text.trim();
    el.appendChild(sr);
  });

  // hide intro-animated elements BEFORE the preloader curtain lifts,
  // otherwise the hero flashes in its final state for ~0.5s
  if (!prefersReduced) {
    gsap.set(".hero__title .char", { yPercent: 120 });
    gsap.set([".hero__eyebrow", ".hero__foot"], { opacity: 0 });
    gsap.set(".hero__sub", { opacity: 0, y: 32 });
    gsap.set(".header", { yPercent: -120 });
  }

  /* ── Preloader ───────────────────────────── */
  const preloader = document.getElementById("preloader");
  const counterEl = document.getElementById("loaderCount");
  const barEl = document.getElementById("loaderBar");

  const heroIntro = () => {
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.to(".hero__video", { scale: 1, duration: 3.4, ease: "power2.out" }, 0)
      .fromTo(".hero__eyebrow", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, 0.1)
      .fromTo(".hero__title .char",
        { yPercent: 120 },
        { yPercent: 0, duration: 1.3, stagger: 0.024 }, 0.2)
      .to(".hero__sub", { opacity: 1, y: 0, duration: 1 }, 0.9)
      .fromTo(".hero__foot", { opacity: 0 }, { opacity: 1, duration: 1 }, 1.1)
      .fromTo(".header", { yPercent: -120 }, {
        yPercent: 0, duration: 1,
        // inline transform would forever override .is-hidden — drop it
        onComplete: () => gsap.set(".header", { clearProps: "transform" })
      }, 1);
  };

  if (prefersReduced) {
    preloader.style.display = "none";
    gsap.set([".hero__sub", ".hero__foot", ".hero__eyebrow"], { opacity: 1, y: 0 });
  } else {
    let progress = 0;
    const tick = () => {
      // small, frequent steps read as one continuous motion
      progress = Math.min(100, progress + gsap.utils.random(1.5, 5));
      counterEl.textContent = String(Math.floor(progress)).padStart(2, "0");
      barEl.style.width = progress + "%";
      if (progress < 100) setTimeout(tick, gsap.utils.random(30, 85));
      else finish();
    };
    const finish = () => {
      gsap.timeline()
        .to(".preloader__inner, .preloader__counter", { opacity: 0, y: -24, duration: 0.8, ease: "power2.inOut", stagger: 0.1 })
        .to(preloader, {
          clipPath: "inset(0 0 100% 0)", duration: 1.6, ease: "expo.inOut",
          onComplete: () => { preloader.style.display = "none"; }
        }, "-=0.3")
        .add(heroIntro, "-=1.25");
    };
    gsap.set(preloader, { clipPath: "inset(0 0 0% 0)" });
    setTimeout(tick, 400);
  }

  /* ── Custom cursor ───────────────────────── */
  if (finePointer && !prefersReduced) {
    document.body.classList.add("has-cursor");
    const cursor = document.getElementById("cursor");
    const dot = cursor.querySelector(".cursor__dot");
    const ring = cursor.querySelector(".cursor__ring");
    const label = cursor.querySelector(".cursor__label");
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const ringPos = { x: pos.x, y: pos.y };

    cursor.style.opacity = "0";
    window.addEventListener("mousemove", (e) => {
      pos.x = e.clientX; pos.y = e.clientY;
      cursor.style.opacity = "1";
    }, { passive: true });

    gsap.ticker.add(() => {
      ringPos.x += (pos.x - ringPos.x) * 0.16;
      ringPos.y += (pos.y - ringPos.y) * 0.16;
      dot.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%,-50%)`;
    });

    document.querySelectorAll("[data-cursor]").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        label.textContent = el.dataset.cursor;
        cursor.classList.add("cursor--active");
      });
      el.addEventListener("mouseleave", () => cursor.classList.remove("cursor--active"));
    });
  }

  /* ── Magnetic elements ───────────────────── */
  if (finePointer && !prefersReduced) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = 0.35;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - (r.left + r.width / 2)) * strength,
          y: (e.clientY - (r.top + r.height / 2)) * strength,
          duration: 0.5, ease: "power3.out", overwrite: "auto"
        });
      });
      el.addEventListener("mouseleave", () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.35)", overwrite: "auto" });
      });
    });
  }

  /* header stays visible while scrolling — the logo travels with the user
     and will anchor the contact CTA (deliberate CRO choice) */

  /* ── Menu overlay ────────────────────────── */
  const menu = document.getElementById("menuOverlay");
  const menuBtn = document.getElementById("menuBtn");
  const menuBtnLabel = menuBtn.querySelector(".menu-btn__label");
  const menuImg = document.getElementById("menuImg");
  let menuOpen = false;
  let pendingScroll = null; // section to scroll to once the menu has closed
  let closeTimer = null;

  const mainEl = document.getElementById("main");
  const headerLogo = document.querySelector(".header__logo");
  const menuBg = menu.querySelector(".menu__bg");

  // runs when the closing curtain has finished (or by fallback timer):
  // Lenis must be running again BEFORE scrollTo, else it's ignored
  const finishClose = () => {
    if (menuOpen) return; // reopened mid-close
    lenis?.start();
    if (pendingScroll) { scrollTo(pendingScroll); pendingScroll = null; }
  };
  menuBg.addEventListener("transitionend", (e) => {
    if (e.propertyName === "transform" && !menuOpen) {
      clearTimeout(closeTimer);
      finishClose();
    }
  });

  // menu choreography lives in CSS (.is-open) — JS only flips state
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
      pendingScroll = null;
      clearTimeout(closeTimer);
      lenis?.stop();
      mainEl?.setAttribute("inert", "");
      headerLogo?.setAttribute("inert", "");
      menu.querySelector(".menu__link")?.focus({ preventScroll: true });
    } else {
      mainEl?.removeAttribute("inert");
      headerLogo?.removeAttribute("inert");
      menuBtn.focus({ preventScroll: true });
      clearTimeout(closeTimer);
      closeTimer = setTimeout(finishClose, 950); // fallback if transitionend is missed
    }
  };

  menuBtn.addEventListener("click", () => toggleMenu());
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) toggleMenu(false); });

  // focus trap: keep Tab inside the open menu (menu links + close button)
  window.addEventListener("keydown", (e) => {
    if (!menuOpen || e.key !== "Tab") return;
    const focusables = [menuBtn, ...menu.querySelectorAll("a[href]")];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  menu.querySelectorAll(".menu__link").forEach((link) => {
    link.addEventListener("mouseenter", () => {
      if (link.dataset.img) {
        menuImg.style.backgroundImage = `url('${link.dataset.img}')`;
        menuImg.classList.add("is-visible");
      }
    });
    link.addEventListener("mouseleave", () => menuImg.classList.remove("is-visible"));
    link.addEventListener("click", (e) => {
      e.preventDefault();
      pendingScroll = link.getAttribute("href");
      toggleMenu(false);
    });
  });

  /* ── Generic reveals ─────────────────────── */
  if (!prefersReduced) {
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1.1, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });

    // char reveals outside hero (hero handled by intro)
    document.querySelectorAll(".projects__title, .values__word, .quote__text > span, .contact__cta > span, .digital__title .hero__line").forEach((el) => {
      const chars = el.querySelectorAll(".char");
      if (!chars.length) return;
      gsap.fromTo(chars, { yPercent: 120 }, {
        yPercent: 0, duration: 1.1, stagger: 0.02, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 90%" }
      });
    });
  }

  /* ── Manifesto: words light up on scrub ──── */
  const manifestoText = document.getElementById("manifestoText");
  if (manifestoText) {
    const words = manifestoText.textContent.trim().split(/[ \n\r\t]+/);
    manifestoText.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
    const wordEls = manifestoText.querySelectorAll(".w");
    const sign = document.querySelector(".manifesto__sign");

    if (!prefersReduced) {
      ScrollTrigger.create({
        trigger: ".manifesto",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const lit = Math.floor(self.progress * 1.25 * wordEls.length);
          wordEls.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
          sign.classList.toggle("is-visible", self.progress > 0.82);
        }
      });
    }
  }

  /* ── Process: step switching on scrub ────── */
  const processSteps = document.querySelectorAll(".process__step");
  const processImgs = document.querySelectorAll(".process__img");
  const processBar = document.getElementById("processBar");
  if (processSteps.length && !prefersReduced) {
    const processST = ScrollTrigger.create({
      trigger: ".process",
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const idx = Math.min(processSteps.length - 1, Math.floor(self.progress * processSteps.length));
        processSteps.forEach((s, i) => s.classList.toggle("is-active", i === idx));
        processImgs.forEach((im, i) => im.classList.toggle("is-active", i === idx));
        processBar.style.width = (self.progress * 100) + "%";
      }
    });

    // fast flicks blow through the section — once scrolling settles,
    // ease to the nearest step so every stage is actually seen
    if (lenis) {
      const centers = [0.125, 0.375, 0.625, 0.875];
      let snapTimer = null;
      let snapping = false;
      lenis.on("scroll", () => {
        if (snapping) return;
        clearTimeout(snapTimer);
        snapTimer = setTimeout(() => {
          const p = processST.progress;
          if (p <= 0.04 || p >= 0.96) return; // near the edges: let the user leave freely
          const target = centers.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a));
          const y = processST.start + target * (processST.end - processST.start);
          if (Math.abs(window.scrollY - y) < 4) return;
          snapping = true;
          lenis.scrollTo(y, {
            duration: 0.8,
            onComplete: () => { snapping = false; }
          });
        }, 180);
      });
    }
  }

  /* ── Projects: horizontal scroll ─────────── */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
    const track = document.getElementById("projectsTrack");
    const pin = document.getElementById("projectsPin");
    const getDist = () => track.scrollWidth - window.innerWidth;

    const tween = gsap.to(track, {
      x: () => -getDist(),
      ease: "none",
      scrollTrigger: {
        trigger: pin,
        start: "top 12%",
        end: () => "+=" + getDist(),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1
      }
    });

    // inner parallax per card
    document.querySelectorAll(".pcard__img").forEach((img) => {
      gsap.fromTo(img, { xPercent: -6 }, {
        xPercent: 6, ease: "none",
        scrollTrigger: {
          trigger: img.closest(".pcard"),
          containerAnimation: tween,
          start: "left right",
          end: "right left",
          scrub: true
        }
      });
    });
  });

  /* ── Quote parallax ──────────────────────── */
  if (!prefersReduced) {
    gsap.fromTo(".quote__media", { yPercent: -8 }, {
      yPercent: 8, ease: "none",
      scrollTrigger: { trigger: ".quote", start: "top bottom", end: "bottom top", scrub: true }
    });
  }

  /* ── Hero: cinematic exit on scroll ──────── */
  if (!prefersReduced) {
    gsap.to(".hero__content", {
      yPercent: -18, opacity: 0.25, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 40%", scrub: true }
    });
  }

  /* ── Hero video resilience ───────────────── */
  const heroVideo = document.getElementById("heroVideo");
  if (heroVideo) {
    const sources = heroVideo.querySelectorAll("source");
    const lastSource = sources[sources.length - 1];
    const usePoster = () => {
      const poster = heroVideo.getAttribute("poster");
      const media = heroVideo.parentElement;
      heroVideo.remove();
      const img = document.createElement("img");
      img.src = poster;
      img.alt = "";
      img.className = "hero__video";
      media.prepend(img);
      gsap.to(img, { scale: 1, duration: 2.4, ease: "power2.out" });
    };
    lastSource?.addEventListener("error", usePoster);
    heroVideo.addEventListener("error", usePoster);
    if (prefersReduced) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.pause();
    } else {
      // autoplay guard (low power mode etc.)
      heroVideo.play?.().catch(() => {});
    }

    // WCAG 2.2.2: visible control to stop the looping video
    const videoToggle = document.getElementById("videoToggle");
    const toggleLabel = videoToggle?.querySelector("span");
    videoToggle?.addEventListener("click", () => {
      const playing = !heroVideo.paused;
      if (playing) heroVideo.pause();
      else heroVideo.play?.().catch(() => {});
      videoToggle.setAttribute("aria-pressed", String(playing));
      videoToggle.setAttribute("aria-label", playing ? "Відтворити відео" : "Зупинити відео");
      if (toggleLabel) toggleLabel.textContent = playing ? toggleLabel.dataset.play : toggleLabel.dataset.pause;
    });
  }

  /* ── Anchors ─────────────────────────────── */
  document.querySelector(".hero__scroll")?.addEventListener("click", (e) => { e.preventDefault(); scrollTo("#manifesto"); });
  document.getElementById("toTop")?.addEventListener("click", (e) => { e.preventDefault(); scrollTo("#hero"); });
  document.querySelector(".header__logo")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (menuOpen) { pendingScroll = "#hero"; toggleMenu(false); }
    else scrollTo("#hero");
  });

  /* ── Refresh after images settle ─────────── */
  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
    // idle-preload hover/offscreen imagery so it never pops in late
    const preload = () => {
      const urls = [
        ...[...document.querySelectorAll(".menu__link[data-img]")].map((a) => a.dataset.img),
        ...[...document.querySelectorAll(".pcard__img")].map((img) => img.currentSrc || img.src)
      ];
      urls.forEach((u) => { const im = new Image(); im.src = u; });
    };
    if ("requestIdleCallback" in window) requestIdleCallback(preload, { timeout: 4000 });
    else setTimeout(preload, 2500);
  });
})();
