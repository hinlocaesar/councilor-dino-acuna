/* =============================================================================
   Councilor Dino Acuña — site behaviour
   Sections: 1 data render · 2 nav · 3 reveal · 4 scroll fx · 5 video filter
             6 video modal · 7 misc
   ========================================================================== */
(function () {
  "use strict";

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DATA = window.SITE_DATA || { videos: [], posts: [] };

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  var PLAY_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/></svg>';

  /* ====================================================== 1 · data render */
  function renderVideos() {
    var host = $("[data-videos]");
    if (!host) return;

    if (!DATA.videos.length) {
      host.innerHTML = '<p class="videos-empty">No videos published yet.</p>';
      return;
    }

    var labels = { council: "Council", program: "Programme", field: "Field" };

    host.innerHTML = DATA.videos.map(function (v, i) {
      var thumb = v.thumb
        ? '<img class="vcard-img" src="' + esc(v.thumb) + '" alt="" loading="lazy" decoding="async" />'
        : "";
      return '' +
      '<article class="vcard reveal" data-category="' + esc(v.category) + '" data-index="' + i + '">' +
        '<span class="vcard-thumb">' +
          thumb +
          '<span class="vcard-cat" data-cat="' + esc(v.category) + '">' + esc(labels[v.category] || v.category) + '</span>' +
          (v.still ? '<span class="vcard-still">Photo</span>' : "") +
          '<span class="vcard-play">' + PLAY_ICON + '</span>' +
          (v.duration && v.duration !== "—" ? '<span class="vcard-time">' + esc(v.duration) + '</span>' : "") +
        '</span>' +
        '<div class="vcard-body">' +
          '<h3>' + esc(v.title) + '</h3>' +
          '<p>' + esc(v.caption) + '</p>' +
          '<span class="vcard-meta">' +
            (v.views ? '<b>' + esc(v.views) + '</b> views' : "") +
            (v.views && v.when ? '<i>·</i>' : "") +
            (v.when ? esc(v.when) : "") +
          '</span>' +
        '</div>' +
        '<button class="vcard-hit" type="button" ' +
          'data-url="' + esc(v.url) + '" ' +
          'data-title="' + esc(v.title) + '" ' +
          'data-caption="' + esc(v.caption || "") + '" ' +
          'data-index="' + i + '" ' +
          'aria-label="Play video: ' + esc(v.title) + '"></button>' +
      '</article>';
    }).join("");
  }

  function renderPosts() {
    var host = $("[data-posts]");
    if (!host) return;

    if (!DATA.posts.length) {
      host.innerHTML = '<p class="videos-empty">No entries yet.</p>';
      return;
    }

    host.innerHTML = DATA.posts.map(function (p) {
      var thumb = p.featuredImage
        ? '<a class="post-thumb" href="' + esc(p.url) + '" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">' +
            '<img src="' + esc(p.featuredImage) + '" alt="" loading="lazy" decoding="async" />' +
          '</a>'
        : "";
      return '' +
      '<article class="post post-has-img reveal">' +
        thumb +
        '<div class="post-body">' +
          '<div class="post-top">' +
            '<span class="post-tag">' + esc(p.tag) + '</span>' +
            '<time class="post-date">' + esc(p.date) + '</time>' +
          '</div>' +
          '<h3><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.title) + '</a></h3>' +
          '<p>' + esc(p.excerpt) + '</p>' +
          '<a class="link" href="' + esc(p.url) + '" target="_blank" rel="noopener">Read the entry' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</a>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  /* ============================================================== 2 · nav */
  function initNav() {
    var header = $("[data-header]");
    var toggle = $("[data-nav-toggle]");
    var nav    = $("#nav");
    var scrim  = $("[data-nav-scrim]");

    function setOpen(open) {
      if (!nav || !toggle) return;
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("is-locked", open);
      menuOpen = open;
      if (scrim) scrim.hidden = !open;
      if (header && open) header.classList.remove("is-hidden");
    }

    if (toggle) {
      toggle.addEventListener("click", function () {
        setOpen(!nav.classList.contains("is-open"));
      });
    }
    if (scrim) scrim.addEventListener("click", function () { setOpen(false); });
    if (nav) {
      nav.addEventListener("click", function (e) {
        if (e.target.closest("a")) setOpen(false);
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) setOpen(false);
    });

    // scroll state: stick, and hide on scroll-down / show on scroll-up
    var lastY = window.scrollY;
    var menuOpen = false;
    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (header) {
          header.classList.toggle("is-stuck", y > 24);
          var down = y > lastY + 4;
          if (menuOpen) {
            header.classList.remove("is-hidden");
          } else {
            header.classList.toggle("is-hidden", y > 420 && down);
            if (y < lastY - 4) header.classList.remove("is-hidden");
          }
        }
        lastY = y;
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // active link highlighting
    var links = $$("#nav a[href^='#']");
    var targets = links
      .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
      .filter(Boolean);

    if (targets.length && "IntersectionObserver" in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id);
          });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      targets.forEach(function (t) { spy.observe(t); });
    }
  }

  /* =========================================================== 3 · reveal */
  function initReveal() {
    // apply data-delay to custom property
    $$("[data-delay]").forEach(function (el) {
      el.style.setProperty("--d", el.getAttribute("data-delay"));
    });

    var items = $$(".reveal");
    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      $$("[data-timeline] .tl-item").forEach(function (el) { el.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });

    // timeline dots
    var tlItems = $$("[data-timeline] .tl-item");
    if (tlItems.length && "IntersectionObserver" in window) {
      var tio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            tio.unobserve(en.target);
          }
        });
      }, { rootMargin: "0px 0px -35% 0px", threshold: 0.3 });
      tlItems.forEach(function (el) { tio.observe(el); });
    }
  }

  /* ======================================================== 4 · scroll fx */
  function initScrollFx() {
    var bar = $("[data-progress-bar]");
    var ticking = false;

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
      if (bar) bar.style.width = pct.toFixed(2) + "%";
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();

    // gentle parallax on hero orbs
    if (!reduced) {
      var orbs = $$(".hero-bg .orb");
      window.addEventListener("scroll", function () {
        var y = window.scrollY;
        if (y > window.innerHeight) return;
        orbs.forEach(function (o, i) {
          o.style.translate = "0 " + (y * (0.06 + i * 0.035)).toFixed(1) + "px";
        });
      }, { passive: true });
    }
  }

  /* ==================================================== 5 · video filter */
  function initFilter() {
    var chips = $$("[data-filter]");
    if (!chips.length) return;

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var want = chip.getAttribute("data-filter");
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle("is-active", on);
          c.setAttribute("aria-selected", String(on));
        });
        var shown = 0;
        $$(".vcard").forEach(function (card) {
          var match = want === "all" || card.getAttribute("data-category") === want;
          card.classList.toggle("is-hidden", !match);
          if (match) {
            shown++;
            card.animate(
              [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }],
              { duration: reduced ? 1 : 420, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }
            );
          }
        });
        // keep filter chips revealed
        var toolbar = $(".video-toolbar");
        if (toolbar) toolbar.classList.add("is-in");
      });
    });
  }

  /* ===================================================== 6 · video modal */
  function initModal() {
    var modal   = $("[data-modal]");
    var frame   = $("[data-modal-frame]");
    var titleEl = $("[data-modal-title]");
    var subEl   = $("[data-modal-sub]");
    var linkEl  = $("[data-modal-link]");
    if (!modal || !frame) return;

    var lastFocus = null;

    function fbEmbed(url) {
      return "https://www.facebook.com/plugins/video.php?href=" +
        encodeURIComponent(url) + "&show_text=0&autoplay=1&width=100%";
    }

    var loadTimer = null;

    function open(video) {
      lastFocus = document.activeElement;
      titleEl.textContent = video.title;
      subEl.textContent = video.caption || "";
      linkEl.href = video.url;
      linkEl.removeAttribute("hidden");

      frame.innerHTML =
        '<div class="modal-loading">' +
          '<span class="vcard-play">' + PLAY_ICON + '</span>' +
          '<p data-load-msg>Loading from Facebook…</p>' +
        '</div>' +
        '<iframe src="' + esc(fbEmbed(video.url)) +
        '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" ' +
        'allowfullscreen title="' + esc(video.title) + '"></iframe>';

      var iframe = $("iframe", frame);
      if (iframe) {
        iframe.addEventListener("load", function () {
          var l = $(".modal-loading", frame);
          if (l) l.remove();
        });
      }

      // Facebook embeds can stall behind a login wall — offer a manual way out.
      window.clearTimeout(loadTimer);
      loadTimer = window.setTimeout(function () {
        var msg = $("[data-load-msg]", frame);
        if (!msg) return; // already loaded
        msg.innerHTML =
          "Taking longer than usual. Facebook may require a login — " +
          '<a href="' + esc(video.url) + '" target="_blank" rel="noopener">open this clip directly</a>.';
      }, 6000);

      modal.hidden = false;
      document.body.classList.add("is-locked");
      var close = $(".modal-close", modal);
      if (close) close.focus();
    }

    function close() {
      window.clearTimeout(loadTimer);
      frame.innerHTML = "";
      modal.hidden = true;
      document.body.classList.remove("is-locked");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // Read everything from the card's own data-* attributes, so the markup
    // stays self-describing and works even if data.js is out of date.
    document.addEventListener("click", function (e) {
      var hit = e.target.closest(".vcard-hit");
      if (!hit) return;
      var url = hit.getAttribute("data-url");
      if (!url) return;
      e.preventDefault();
      open({
        url: url,
        title: hit.getAttribute("data-title"),
        caption: hit.getAttribute("data-caption") || ""
      });
    });

    $$("[data-modal-close]", modal).forEach(function (el) {
      el.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) close();
    });
  }

  /* ============================================================ 7 · misc */
  function initMisc() {
    var y = $("[data-year]");
    if (y) y.textContent = new Date().getFullYear();

    // If a photo fails to load, drop it so the branded gradient tile shows
    // through cleanly instead of a broken-image icon.
    document.addEventListener(
      "error",
      function (e) {
        var t = e.target;
        if (!t || t.tagName !== "IMG") return;

        if (t.classList.contains("vcard-img")) {
          t.remove();
          return;
        }
        if (!t.dataset.failed) {
          t.dataset.failed = "1";
          t.style.opacity = "0.25";
          t.style.filter = "grayscale(1)";
          t.alt = (t.alt || "") + " (image unavailable offline)";
        }
      },
      true
    );
  }

  /* ================================================================ boot */
  function boot() {
    renderVideos();
    renderPosts();
    initNav();
    initReveal();
    initScrollFx();
    initFilter();
    initModal();
    initMisc();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
