/* ==============================
   ONDUS TATTOO — SCRIPT
   ============================== */

(function () {
  "use strict";

  /* ---- INTRO ANIMATION ---- */
  const intro = document.getElementById("intro");
  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function endIntro() {
    if (!intro) return;
    intro.classList.add("is-done");
    document.documentElement.classList.remove("intro-active");
  }

  if (intro) {
    if (reduceMotion) {
      endIntro();
    } else {
      // The intro plays via CSS; remove it when its exit animation finishes,
      // with a safety timeout in case the animationend event doesn't fire.
      let ended = false;
      const finish = () => { if (!ended) { ended = true; endIntro(); } };
      intro.addEventListener("animationend", (e) => {
        if (e.target === intro) finish();
      });
      // Click anywhere to skip
      intro.addEventListener("click", finish);
      // Safety net (CSS timeline ends around 3.2s)
      setTimeout(finish, 4000);
    }
  } else {
    document.documentElement.classList.remove("intro-active");
  }

  /* ---- ALERT BANNER (avviso ferie) ---- */
  const alertBanner = document.getElementById("alertBanner");
  const alertBannerClose = document.getElementById("alertBannerClose");

  function syncBannerHeight() {
    if (!alertBanner) return;
    const h = alertBanner.classList.contains("is-hidden")
      ? 0
      : alertBanner.offsetHeight;
    document.documentElement.style.setProperty("--banner-h", h + "px");
  }

  if (alertBanner) {
    document.body.classList.add("has-banner");
    syncBannerHeight();
    window.addEventListener("resize", syncBannerHeight, { passive: true });

    if (alertBannerClose) {
      alertBannerClose.addEventListener("click", () => {
        alertBanner.classList.add("is-hidden");
        // Wait for the slide-up transition before zeroing the offset
        setTimeout(() => {
          document.body.classList.remove("has-banner");
          document.documentElement.style.setProperty("--banner-h", "0px");
        }, 400);
      });
    }
  }

  /* ---- YEAR ---- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- MOBILE NAV ---- */
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("open");
      menu.classList.toggle("open");
      document.body.style.overflow = menu.classList.contains("open") ? "hidden" : "";
    });

    menu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        toggle.classList.remove("open");
        menu.classList.remove("open");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---- LANGUAGE ---- */
  const langCurrent = document.getElementById("langCurrent");
  const langList = document.getElementById("langList");
  const langLabel = document.getElementById("langLabel");

  const STORAGE_KEY = "ondus_lang";
  const DEFAULT_LANG = "it";

  function applyLanguage(lang) {
    if (!TRANSLATIONS[lang]) lang = DEFAULT_LANG;
    const dict = TRANSLATIONS[lang];
    document.documentElement.setAttribute("lang", lang);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) el.textContent = dict[key];
    });

    if (langLabel) langLabel.textContent = lang.toUpperCase();
    if (langList) {
      langList.querySelectorAll("li").forEach((li) => {
        li.classList.toggle("active", li.getAttribute("data-lang") === lang);
      });
    }

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  if (langCurrent && langList) {
    langCurrent.addEventListener("click", (e) => {
      e.stopPropagation();
      langList.classList.toggle("open");
    });

    langList.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => {
        applyLanguage(li.getAttribute("data-lang"));
        langList.classList.remove("open");
      });
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".nav__lang")) {
        langList.classList.remove("open");
      }
    });
  }

  let savedLang = DEFAULT_LANG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && TRANSLATIONS[stored]) savedLang = stored;
  } catch (e) {}
  applyLanguage(savedLang);

  /* ---- REVEAL ON SCROLL ---- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
  }

  /* ---- COUNTER ANIMATION ---- */
  function animateCounter(el) {
    if (el.dataset.done === "1") return;
    el.dataset.done = "1";

    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || "";
    const duration = parseInt(el.dataset.duration, 10) || 1600;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic — fast start, slow end
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * target);
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(tick);
  }

  const counters = document.querySelectorAll(".counter");
  if (counters.length) {
    if ("IntersectionObserver" in window) {
      const counterIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterIO.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      counters.forEach((c) => counterIO.observe(c));
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* ---- PORTFOLIO FILTERS + LOAD MORE ---- */
  const filters = document.querySelectorAll(".filter");
  const pfItems = document.querySelectorAll(".pf-item");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const loadMoreContainer = document.getElementById("portfolioLoadmore");

  const isMobile = () => window.innerWidth <= 768;
  let extrasLoaded = false;
  let currentFilter = "all";

  function applyMobileHiding() {
    pfItems.forEach((item) => {
      if (item.dataset.extra === "true") {
        item.classList.add("mobile-hidden");
      }
    });
    if (loadMoreContainer) loadMoreContainer.style.display = "block";
  }

  function removeMobileHiding() {
    pfItems.forEach((item) => item.classList.remove("mobile-hidden"));
    if (loadMoreContainer) loadMoreContainer.style.display = "none";
  }

  function applyFilter(f) {
    currentFilter = f;
    pfItems.forEach((item) => {
      const cats = item.getAttribute("data-cat") || "";
      const matchesFilter = f === "all" || cats.split(" ").includes(f);
      if (!matchesFilter) {
        item.classList.add("hidden");
        item.classList.remove("mobile-hidden");
      } else {
        item.classList.remove("hidden");
        // On mobile with "all" filter and extras not loaded, keep extras hidden
        if (f === "all" && isMobile() && !extrasLoaded && item.dataset.extra === "true") {
          item.classList.add("mobile-hidden");
        } else {
          item.classList.remove("mobile-hidden");
        }
      }
    });

    // Show load more only when "all" filter active on mobile with extras not loaded
    if (loadMoreContainer) {
      const showBtn = isMobile() && f === "all" && !extrasLoaded;
      loadMoreContainer.style.display = showBtn ? "block" : "none";
    }
  }

  // Init: hide extras on mobile
  if (isMobile() && !extrasLoaded) {
    applyMobileHiding();
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      extrasLoaded = true;
      removeMobileHiding();
      applyFilter(currentFilter);
    });
  }

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      filters.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilter(btn.getAttribute("data-filter"));
    });
  });

  /* ---- LIGHTBOX ---- */
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbClose = document.getElementById("lbClose");
  const lbPrev = document.getElementById("lbPrev");
  const lbNext = document.getElementById("lbNext");

  let visibleImgs = [];
  let currentIdx = 0;

  function getVisibleImages() {
    return Array.from(pfItems)
      .filter((i) => !i.classList.contains("hidden") && !i.classList.contains("mobile-hidden"))
      .map((i) => i.querySelector("img"));
  }

  function openLightbox(idx) {
    visibleImgs = getVisibleImages();
    currentIdx = idx;
    const img = visibleImgs[currentIdx];
    if (!img) return;
    lbImg.src = img.src.replace("w=800", "w=1600");
    lbImg.alt = img.alt || "";
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function navLightbox(dir) {
    if (!visibleImgs.length) return;
    currentIdx = (currentIdx + dir + visibleImgs.length) % visibleImgs.length;
    const img = visibleImgs[currentIdx];
    if (img) {
      lbImg.src = img.src.replace("w=800", "w=1600");
      lbImg.alt = img.alt || "";
    }
  }

  pfItems.forEach((item, idx) => {
    item.addEventListener("click", () => {
      const visible = getVisibleImages();
      const img = item.querySelector("img");
      const realIdx = visible.indexOf(img);
      if (realIdx >= 0) openLightbox(realIdx);
    });
  });

  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lbPrev) lbPrev.addEventListener("click", () => navLightbox(-1));
  if (lbNext) lbNext.addEventListener("click", () => navLightbox(1));

  if (lb) {
    lb.addEventListener("click", (e) => {
      if (e.target === lb) closeLightbox();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") navLightbox(1);
    if (e.key === "ArrowLeft") navLightbox(-1);
  });

  /* ---- NAV SHADOW ON SCROLL ---- */
  const navEl = document.getElementById("nav");
  if (navEl) {
    const onScroll = () => {
      if (window.scrollY > 40) navEl.classList.add("scrolled");
      else navEl.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();
