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

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      if (dict[key]) el.setAttribute("aria-label", dict[key]);
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

  /* ---- THIRD-PARTY MAPS: LOAD ONLY AFTER CLICK ---- */
  document.querySelectorAll("[data-map-src]").forEach((mapBox) => {
    const button = mapBox.querySelector(".js-load-map");
    if (!button) return;

    button.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = mapBox.dataset.mapSrc;
      iframe.title = mapBox.dataset.mapTitle || "Mappa";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.allowFullscreen = true;
      mapBox.replaceChildren(iframe);
      mapBox.classList.add("is-loaded");
    });
  });

  /* ---- PROCESS VIDEO ----
     Muted autoplay only while on screen (saves data and CPU), nothing is
     downloaded until the section gets close. Reduced motion / data saver:
     no autoplay, the visitor starts it with the play button. */
  const film = document.getElementById("filmVideo");
  const filmFrame = document.getElementById("filmFrame");
  const filmToggle = document.getElementById("filmToggle");
  const filmSound = document.getElementById("filmSound");
  const filmProgress = document.getElementById("filmProgress");

  if (film && filmFrame && filmToggle && filmSound) {
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    let autoplay = !reduceMotion && !saveData;
    let rafId = 0;

    function setAriaKey(el, key) {
      el.setAttribute("data-i18n-aria", key);
      const dict = TRANSLATIONS[document.documentElement.lang] || TRANSLATIONS[DEFAULT_LANG];
      if (dict[key]) el.setAttribute("aria-label", dict[key]);
    }

    function syncFilmUI() {
      filmFrame.classList.toggle("is-paused", film.paused);
      filmFrame.classList.toggle("is-muted", film.muted);
      setAriaKey(filmToggle, film.paused ? "film.play" : "film.pause");
      setAriaKey(filmSound, film.muted ? "film.soundOn" : "film.soundOff");
    }

    function tickProgress() {
      if (filmProgress && film.duration) {
        filmProgress.style.transform = "scaleX(" + film.currentTime / film.duration + ")";
      }
      rafId = requestAnimationFrame(tickProgress);
    }

    function playFilm() {
      const p = film.play();
      if (p && p.catch) {
        p.catch(() => {
          // Unmuted playback can be refused without a fresh user gesture:
          // fall back to muted, otherwise leave it paused with the play button.
          if (!film.muted) {
            film.muted = true;
            film.play().catch(() => {});
          }
          syncFilmUI();
        });
      }
    }

    film.addEventListener("play", () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tickProgress);
      syncFilmUI();
    });
    film.addEventListener("pause", () => {
      cancelAnimationFrame(rafId);
      syncFilmUI();
    });
    film.addEventListener("volumechange", syncFilmUI);

    filmToggle.addEventListener("click", () => {
      if (film.paused) {
        autoplay = true;
        playFilm();
      } else {
        // Respect an explicit pause: don't resume on the next scroll into view
        autoplay = false;
        film.pause();
      }
    });

    filmSound.addEventListener("click", () => {
      film.muted = !film.muted;
      if (!film.muted && film.paused) {
        autoplay = true;
        playFilm();
      }
    });

    if ("IntersectionObserver" in window) {
      // Start buffering a bit before the video scrolls into view
      const preloadIO = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            preloadIO.disconnect();
            if (autoplay && film.readyState === 0) {
              film.preload = "auto";
              film.load();
            }
          }
        },
        { rootMargin: "400px 0px" }
      );
      preloadIO.observe(filmFrame);

      const playIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && autoplay) playFilm();
            else if (!entry.isIntersecting && !film.paused) film.pause();
          });
        },
        { threshold: 0.35 }
      );
      playIO.observe(filmFrame);
    }

    syncFilmUI();
  }

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

  /* ---- PORTFOLIO VIDEO TILES ----
     Silent loops that behave like moving photos: buffered only when the
     grid gets close, played only while on screen. Same reduced motion /
     data saver rules as the process video: poster only. */
  const tileVideos = document.querySelectorAll(".pf-item--video video");
  const tilesAutoplay = !reduceMotion &&
    !(navigator.connection && navigator.connection.saveData);

  if (tileVideos.length && tilesAutoplay && "IntersectionObserver" in window) {
    const tilePreloadIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const v = entry.target;
          tilePreloadIO.unobserve(v);
          if (v.readyState === 0) {
            v.preload = "auto";
            v.load();
          }
        });
      },
      { rootMargin: "400px 0px" }
    );
    const tilePlayIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const v = entry.target;
          if (entry.isIntersecting) {
            const p = v.play();
            if (p && p.catch) p.catch(() => {});
          } else if (!v.paused) {
            v.pause();
          }
        });
      },
      { threshold: 0.2 }
    );
    tileVideos.forEach((v) => {
      tilePreloadIO.observe(v);
      tilePlayIO.observe(v);
    });
  }

  /* ---- LIGHTBOX ----
     Photos open the image; video tiles open the full clip with sound
     (data-video="video/NAME" -> NAME-av1.mp4 with NAME.mp4 as fallback). */
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbVideo = document.getElementById("lbVideo");
  const lbClose = document.getElementById("lbClose");
  const lbPrev = document.getElementById("lbPrev");
  const lbNext = document.getElementById("lbNext");

  const VIDEO_TYPES = [
    ["-av1.mp4", 'video/mp4; codecs="av01.0.04M.10, mp4a.40.2"'],
    [".mp4", 'video/mp4; codecs="avc1.64001F, mp4a.40.2"'],
  ];

  let visibleItems = [];
  let currentIdx = 0;

  function getVisibleItems() {
    return Array.from(pfItems)
      .filter((i) => !i.classList.contains("hidden") && !i.classList.contains("mobile-hidden"));
  }

  function stopLightboxVideo() {
    if (!lbVideo) return;
    lbVideo.pause();
    lbVideo.replaceChildren();
    lbVideo.removeAttribute("src");
    lbVideo.load(); // drops the buffered clip and stops downloading
    lbVideo.hidden = true;
  }

  function showItem(item) {
    if (!item) return;
    const base = item.dataset.video;
    if (base && lbVideo) {
      const tile = item.querySelector("video");
      lbImg.hidden = true;
      lbImg.removeAttribute("src");
      lbVideo.replaceChildren(...VIDEO_TYPES.map(([suffix, type]) => {
        const source = document.createElement("source");
        source.src = base + suffix;
        source.type = type;
        return source;
      }));
      lbVideo.poster = tile ? tile.poster : "";
      lbVideo.setAttribute("aria-label", tile ? tile.getAttribute("aria-label") || "" : "");
      lbVideo.hidden = false;
      lbVideo.load();
      const p = lbVideo.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      const img = item.querySelector("img");
      if (!img) return;
      stopLightboxVideo();
      lbImg.hidden = false;
      lbImg.src = img.src.replace("w=800", "w=1600");
      lbImg.alt = img.alt || "";
    }
  }

  function openLightbox(idx) {
    visibleItems = getVisibleItems();
    currentIdx = idx;
    if (!visibleItems[currentIdx]) return;
    showItem(visibleItems[currentIdx]);
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    stopLightboxVideo();
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function navLightbox(dir) {
    if (!visibleItems.length) return;
    currentIdx = (currentIdx + dir + visibleItems.length) % visibleItems.length;
    showItem(visibleItems[currentIdx]);
  }

  pfItems.forEach((item) => {
    item.addEventListener("click", () => {
      const realIdx = getVisibleItems().indexOf(item);
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
    if (!lb || !lb.classList.contains("open")) return;
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
