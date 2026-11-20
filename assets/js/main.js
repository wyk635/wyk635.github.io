/* ==========================================================================
   Yike Wu — personal site behaviour
   No dependencies. Everything degrades gracefully without JS.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var $ = function (sel, scope) {
    return (scope || document).querySelector(sel);
  };
  var $$ = function (sel, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(sel));
  };

  var store = {
    get: function (k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {}
    }
  };

  /* ---------------------------------------------------------------- toast */

  var toastEl = $("#toast");
  var toastText = $("#toastText");
  var toastTimer = 0;

  function toast(message) {
    if (!toastEl || !toastText) return;
    toastText.textContent = message;
    toastEl.dataset.show = "true";
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.dataset.show = "false";
    }, 2200);
  }

  function copyText(text, doneMessage) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast(doneMessage);
      } catch (e) {
        toast(root.dataset.lang === "zh" ? "复制失败，请手动选择" : "Copy failed — select manually");
      }
      document.body.removeChild(ta);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        function () {
          toast(doneMessage);
        },
        fallback
      );
    } else {
      fallback();
    }
  }

  /* ---------------------------------------------------------------- theme */

  var themeBtn = $("#themeBtn");
  var metaTheme = $$('meta[name="theme-color"]');

  function syncThemeColor() {
    var dark = root.dataset.theme === "dark";
    metaTheme.forEach(function (m) {
      m.setAttribute("content", dark ? "#05070d" : "#f5f6f8");
    });
  }

  function updateThemeLabel() {
    if (!themeBtn) return;
    var zh = root.dataset.lang === "zh";
    var label;
    if (root.dataset.theme === "dark") {
      label = zh ? "切换到浅色主题" : "Switch to light theme";
    } else {
      label = zh ? "切换到深色主题" : "Switch to dark theme";
    }
    themeBtn.setAttribute("aria-label", label);
    themeBtn.setAttribute("title", label);
  }

  function commitTheme(next) {
    root.dataset.theme = next;
    store.set("yw-theme", next);
    syncThemeColor();
    updateThemeLabel();
    if (window.__ywReadCanvasColors) window.__ywReadCanvasColors();
  }

  function applyTheme(next, animate) {
    if (!animate || !document.startViewTransition || reduceMotion.matches) {
      commitTheme(next);
      return;
    }

    var rect = themeBtn ? themeBtn.getBoundingClientRect() : null;
    var x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
    var y = rect ? rect.top + rect.height / 2 : 40;
    var radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    var transition;
    try {
      transition = document.startViewTransition(function () {
        commitTheme(next);
      });
    } catch (e) {
      commitTheme(next);
      return;
    }

    if (transition && transition.ready && transition.ready.then) {
      transition.ready
        .then(function () {
          root.animate(
            {
              clipPath: [
                "circle(0px at " + x + "px " + y + "px)",
                "circle(" + radius + "px at " + x + "px " + y + "px)"
              ]
            },
            {
              duration: 520,
              easing: "cubic-bezier(.22,1,.36,1)",
              pseudoElement: "::view-transition-new(root)"
            }
          );
        })
        .catch(function () {});
    }
    if (transition && transition.finished && transition.finished.catch) {
      transition.finished.catch(function () {});
    }

    // Safety net: never leave the page stuck in the old theme.
    window.setTimeout(function () {
      if (root.dataset.theme !== next) commitTheme(next);
    }, 400);
  }

  syncThemeColor();
  updateThemeLabel();

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
    });
  }

  /* ---------------------------------------------------------------- language */

  var langBtn = $("#langBtn");

  function updateLangLabel() {
    if (!langBtn) return;
    var zh = root.dataset.lang === "zh";
    langBtn.textContent = zh ? "EN" : "中";
    langBtn.setAttribute("aria-label", zh ? "Switch to English" : "切换到中文");
    langBtn.setAttribute("title", zh ? "Switch to English" : "切换到中文");
    var input = $("#paletteInput");
    if (input) input.placeholder = zh ? "跳到…" : "Jump to…";
    updateThemeLabel();
  }

  function applyLang(next) {
    root.dataset.lang = next;
    root.setAttribute("lang", next === "zh" ? "zh-CN" : "en");
    store.set("yw-lang", next);
    updateLangLabel();
    buildPalette();
  }

  updateLangLabel();

  if (langBtn) {
    langBtn.addEventListener("click", function () {
      applyLang(root.dataset.lang === "zh" ? "en" : "zh");
    });
  }

  /* ------------------------------------------------- header + scroll progress */

  var header = $("#siteHeader");
  var progressBar = $("#progressBar");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset || 0;
    if (header) header.classList.toggle("is-stuck", y > 8);
    if (progressBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0;
      progressBar.style.width = pct.toFixed(2) + "%";
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* --------------------------------------- active section + reveal on scroll */

  var navLinks = $$(".nav__link");
  var sections = navLinks
    .map(function (a) {
      return document.getElementById(a.getAttribute("href").slice(1));
    })
    .filter(Boolean);
  var revealEls = $$("[data-reveal]").filter(function (el) {
    return !el.classList.contains("is-in");
  });

  function updateActiveSection() {
    if (!sections.length) return;
    var line = window.innerHeight * 0.35;
    var current = null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top - line <= 0) current = sections[i];
    }
    navLinks.forEach(function (a) {
      a.classList.toggle("is-active", !!current && a.getAttribute("href") === "#" + current.id);
    });
  }

  function updateReveals() {
    if (!revealEls.length) return;
    if (reduceMotion.matches) {
      revealEls.forEach(function (el) {
        el.classList.add("is-in");
      });
      revealEls = [];
      return;
    }
    var limit = window.innerHeight * 0.92;
    revealEls = revealEls.filter(function (el) {
      if (el.getBoundingClientRect().top < limit) {
        el.classList.add("is-in");
        return false;
      }
      return true;
    });
  }

  window.addEventListener(
    "scroll",
    function () {
      updateActiveSection();
      updateReveals();
    },
    { passive: true }
  );
  window.addEventListener("resize", updateActiveSection, { passive: true });
  updateActiveSection();
  updateReveals();

  /* ---------------------------------------------------------- point cloud */

  (function pointField() {
    var canvas = $("#stars");
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0;
    var h = 0;
    var points = [];
    var mouse = { x: -9999, y: -9999, active: false };
    var accent = "#5eead4";
    var ink = "#a8b3c7";
    var raf = 0;
    var running = false;

    // deterministic pseudo-random so the composition is stable across loads
    var seed = 20260301;
    function rand() {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    }

    function readColors() {
      var cs = getComputedStyle(root);
      accent = (cs.getPropertyValue("--accent") || accent).trim() || accent;
      ink = (cs.getPropertyValue("--ink-2") || ink).trim() || ink;
    }
    window.__ywReadCanvasColors = readColors;
    readColors();

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.round(Math.min(90, Math.max(28, (w * h) / 16000)));
      points = [];
      for (var i = 0; i < count; i++) {
        points.push({
          x: rand() * w,
          y: rand() * h,
          vx: (rand() - 0.5) * 0.22,
          vy: (rand() - 0.5) * 0.22,
          r: 0.7 + rand() * 1.4
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var linkDist = w < 640 ? 90 : 128;

      for (var i = 0; i < points.length; i++) {
        var p = points[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        if (mouse.active) {
          var dx = p.x - mouse.x;
          var dy = p.y - mouse.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 16900 && d2 > 0.01) {
            var d = Math.sqrt(d2);
            var push = (1 - d / 130) * 0.55;
            p.x += (dx / d) * push;
            p.y += (dy / d) * push;
          }
        }
      }

      ctx.lineWidth = 1;
      for (var a = 0; a < points.length; a++) {
        for (var b = a + 1; b < points.length; b++) {
          var pa = points[a];
          var pb = points[b];
          var ddx = pa.x - pb.x;
          var ddy = pa.y - pb.y;
          var dd = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dd > linkDist) continue;
          var alpha = (1 - dd / linkDist) * 0.16;
          ctx.strokeStyle = "rgba(122,162,255," + alpha.toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }

      if (mouse.active) {
        for (var k = 0; k < points.length; k++) {
          var q = points[k];
          var qx = q.x - mouse.x;
          var qy = q.y - mouse.y;
          var qd = Math.sqrt(qx * qx + qy * qy);
          if (qd > 170) continue;
          ctx.strokeStyle = "rgba(94,234,212," + ((1 - qd / 170) * 0.32).toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      for (var m = 0; m < points.length; m++) {
        var pt = points[m];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = m % 7 === 0 ? accent : ink;
        ctx.globalAlpha = m % 7 === 0 ? 0.75 : 0.42;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function loop() {
      draw();
      raf = window.requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true;
      if (reduceMotion.matches) {
        draw();
        running = false;
        return;
      }
      raf = window.requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      window.cancelAnimationFrame(raf);
    }

    resize();
    start();

    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        stop();
        resize();
        start();
      }, 180);
    });

    window.addEventListener(
      "pointermove",
      function (e) {
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active =
          mouse.x > -40 &&
          mouse.y > -40 &&
          mouse.x < rect.width + 40 &&
          mouse.y < rect.height + 40;
      },
      { passive: true }
    );

    window.addEventListener("pointerleave", function () {
      mouse.active = false;
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) start();
            else stop();
          });
        },
        { threshold: 0.02 }
      );
      io.observe(canvas);
    }

    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener("change", function () {
        stop();
        start();
      });
    }
  })();

  /* ---------------------------------------------------------------- cards */

  var cards = $$(".card");

  cards.forEach(function (card) {
    card.addEventListener(
      "pointermove",
      function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty(
          "--mx",
          (((e.clientX - rect.left) / rect.width) * 100).toFixed(1) + "%"
        );
        card.style.setProperty(
          "--my",
          (((e.clientY - rect.top) / rect.height) * 100).toFixed(1) + "%"
        );
      },
      { passive: true }
    );

  });

  /* -------------------------------------------------------------- filters */

  var filterBtns = $$(".filter");
  var grid = $("#projectGrid");

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var want = btn.dataset.filter;
      filterBtns.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      cards.forEach(function (card) {
        var show = want === "all" || card.dataset.cat === want;
        card.classList.toggle("is-hidden", !show);
        if (show) {
          card.classList.remove("is-in");
          void card.offsetWidth;
          card.classList.add("is-in");
        }
      });
      if (grid) grid.dataset.filter = want;
    });
  });

  /* --------------------------------------------------------------- bibtex */

  var BIB = {
    wu2026airground:
      "@inproceedings{wu2026airground,\n" +
      "  title     = {Air-Ground Robotic Collaborative Reconstruction by Cross-View Depth Completion in Large-Scale Environment},\n" +
      "  author    = {Wu, Yike},\n" +
      "  booktitle = {IEEE/RSJ International Conference on Intelligent Robots and Systems (IROS)},\n" +
      "  year      = {2026}\n" +
      "}",
    hua2026informative:
      "@article{hua2026informative,\n" +
      "  title   = {Informative Planning with Attention-based Hybrid Belief Reinforcement Learning for Aerial Multi-Target Search and Tracking},\n" +
      "  author  = {Hua, Zhengyu and Wu, Yike and Li, Yuwei and Xing, Li and Huang, Jidong and Li, Peng and Lu, Wencan and Chen, Haoyao},\n" +
      "  journal = {IEEE Robotics and Automation Letters},\n" +
      "  volume  = {11},\n" +
      "  number  = {7},\n" +
      "  pages   = {8936--8943},\n" +
      "  year    = {2026},\n" +
      "  doi     = {10.1109/LRA.2026.3700661}\n" +
      "}",
    guo2023phsensing:
      "@article{guo2023phsensing,\n" +
      "  title   = {A Machine Vision Enabled Implantable pH Sensing Scheme Using Ultrasonic Images of Micro-Composite Hydrogels},\n" +
      "  author  = {Guo, Changqing and Wu, Yike and Ma, Yi and Jiang, Hongjie},\n" +
      "  journal = {IEEE Sensors Journal},\n" +
      "  volume  = {23},\n" +
      "  number  = {22},\n" +
      "  pages   = {27771--27778},\n" +
      "  year    = {2023},\n" +
      "  doi     = {10.1109/JSEN.2023.3323558}\n" +
      "}"
  };

  $$("[data-bib]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.dataset.bib;
      if (!BIB[key]) return;
      copyText(BIB[key], root.dataset.lang === "zh" ? "BibTeX 已复制" : "BibTeX copied");
    });
  });

  /* ----------------------------------------------------------- copy email */

  var copyEmail = $("#copyEmail");
  if (copyEmail) {
    copyEmail.addEventListener("click", function () {
      copyText(
        copyEmail.dataset.email,
        root.dataset.lang === "zh" ? "邮箱已复制" : "Email copied"
      );
    });
  }

  /* ---------------------------------------------------------- mobile sheet */

  var sheet = $("#sheet");
  var menuBtn = $("#menuBtn");
  var sheetClose = $("#sheetClose");
  var lastFocus = null;

  function lockScroll(on) {
    document.body.style.overflow = on ? "hidden" : "";
  }

  // Keep keyboard focus inside the open overlay instead of letting it wander
  // into the page behind (the overlays claim aria-modal, so make it true).
  var behind = ["#siteHeader", "#main", ".site-footer"]
    .map(function (sel) {
      return $(sel);
    })
    .filter(Boolean);

  function setBehindInert(on) {
    behind.forEach(function (el) {
      if (on) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }

  function openSheet() {
    if (!sheet) return;
    closePalette();
    lastFocus = document.activeElement;
    sheet.dataset.open = "true";
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    lockScroll(true);
    setBehindInert(true);
    if (sheetClose) sheetClose.focus();
  }

  function closeSheet() {
    if (!sheet || sheet.dataset.open !== "true") return;
    sheet.dataset.open = "false";
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    lockScroll(false);
    setBehindInert(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (menuBtn) menuBtn.addEventListener("click", openSheet);
  if (sheetClose) sheetClose.addEventListener("click", closeSheet);
  if (sheet) {
    $$(".sheet__link", sheet).forEach(function (a) {
      a.addEventListener("click", function () {
        closeSheet();
      });
    });
  }

  /* ------------------------------------------------------ command palette */

  var palette = $("#palette");
  var paletteInput = $("#paletteInput");
  var paletteList = $("#paletteList");
  var paletteBtn = $("#paletteBtn");
  var paletteItems = [];
  var paletteIndex = 0;

  function paletteData() {
    return [
      { en: "About", zh: "关于", hint: "01", run: function () { goTo("#about"); } },
      { en: "Projects", zh: "项目", hint: "02", run: function () { goTo("#projects"); } },
      {
        en: "Publications",
        zh: "论文",
        hint: "03",
        run: function () { goTo("#publications"); }
      },
      { en: "Experience", zh: "经历", hint: "04", run: function () { goTo("#experience"); } },
      { en: "Contact", zh: "联系", hint: "05", run: function () { goTo("#contact"); } },
      {
        en: "Toggle theme",
        zh: "切换主题",
        hint: "T",
        run: function () {
          applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
        }
      },
      {
        en: "Switch language / 中文",
        zh: "切换语言 / English",
        hint: "L",
        run: function () {
          applyLang(root.dataset.lang === "zh" ? "en" : "zh");
        }
      },
      {
        en: "Copy email",
        zh: "复制邮箱",
        hint: "@",
        run: function () {
          copyText(
            "wuyike1122@outlook.com",
            root.dataset.lang === "zh" ? "邮箱已复制" : "Email copied"
          );
        }
      },
      {
        en: "Download CV (PDF)",
        zh: "下载简历 (PDF)",
        hint: "↓",
        run: function () {
          window.open("assets/cv.pdf", "_blank", "noopener");
        }
      },
      {
        en: "GitHub profile",
        zh: "GitHub 主页",
        hint: "↗",
        run: function () {
          window.open("https://github.com/wyk635", "_blank", "noopener");
        }
      },
      {
        en: "ORCID record",
        zh: "ORCID 页面",
        hint: "↗",
        run: function () {
          window.open("https://orcid.org/0009-0007-6688-6878", "_blank", "noopener");
        }
      }
    ];
  }

  function goTo(hash) {
    var el = document.querySelector(hash);
    if (!el) return;
    closePalette();
    el.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    if (history.replaceState) history.replaceState(null, "", hash);
  }

  function buildPalette() {
    paletteItems = paletteData();
    renderPalette(paletteInput ? paletteInput.value : "");
  }

  function renderPalette(query) {
    if (!paletteList) return;
    var zh = root.dataset.lang === "zh";
    var q = (query || "").trim().toLowerCase();
    var matches = paletteItems.filter(function (item) {
      if (!q) return true;
      return item.en.toLowerCase().indexOf(q) !== -1 || item.zh.toLowerCase().indexOf(q) !== -1;
    });
    paletteIndex = Math.min(paletteIndex, Math.max(0, matches.length - 1));
    paletteList.innerHTML = matches
      .map(function (item, i) {
        return (
          '<li><button class="palette__item" type="button" role="option" data-index="' + i +
          '" data-active="' + (i === paletteIndex) + '">' +
          "<span>" + (zh ? item.zh : item.en) + "</span><kbd>" + item.hint +
          "</kbd></button></li>"
        );
      })
      .join("");
    $$(".palette__item", paletteList).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = matches[Number(btn.dataset.index)];
        if (item) item.run();
      });
    });
    paletteList.__matches = matches;
  }

  function openPalette() {
    if (!palette) return;
    closeSheet();
    palette.dataset.open = "true";
    paletteIndex = 0;
    if (paletteInput) paletteInput.value = "";
    renderPalette("");
    lockScroll(true);
    setBehindInert(true);
    if (paletteInput) paletteInput.focus();
  }

  function closePalette() {
    if (!palette || palette.dataset.open !== "true") return;
    palette.dataset.open = "false";
    lockScroll(false);
    setBehindInert(false);
  }

  if (paletteInput) {
    paletteInput.addEventListener("input", function () {
      paletteIndex = 0;
      renderPalette(paletteInput.value);
    });

    paletteInput.addEventListener("keydown", function (e) {
      var matches = (paletteList && paletteList.__matches) || [];
      if (e.key === "ArrowDown") {
        e.preventDefault();
        paletteIndex = (paletteIndex + 1) % Math.max(1, matches.length);
        renderPalette(paletteInput.value);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        paletteIndex = (paletteIndex - 1 + matches.length) % Math.max(1, matches.length);
        renderPalette(paletteInput.value);
      } else if (e.key === "Enter") {
        e.preventDefault();
        var item = matches[paletteIndex];
        if (item) item.run();
      } else if (e.key === "Escape") {
        closePalette();
      }
    });
  }

  if (palette) {
    palette.addEventListener("click", function (e) {
      if (e.target === palette) closePalette();
    });
  }

  if (paletteBtn) {
    var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    paletteBtn.textContent = isMac ? "⌘K" : "Ctrl K";
    paletteBtn.setAttribute(
      "aria-label",
      root.dataset.lang === "zh" ? "打开快捷操作面板" : "Open quick actions"
    );
    paletteBtn.addEventListener("click", openPalette);
  }

  buildPalette();

  /* ----------------------------------------------------------- global keys */

  document.addEventListener("keydown", function (e) {
    var meta = e.metaKey || e.ctrlKey;

    if (meta && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      if (palette && palette.dataset.open === "true") closePalette();
      else openPalette();
      return;
    }

    if (e.key === "Escape") {
      closePalette();
      closeSheet();
      return;
    }

    var tag = (e.target && e.target.tagName) || "";
    if (!meta && !e.altKey && tag !== "INPUT" && tag !== "TEXTAREA") {
      if (e.key === "t" || e.key === "T") {
        applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
      } else if (e.key === "l" || e.key === "L") {
        applyLang(root.dataset.lang === "zh" ? "en" : "zh");
      }
    }
  });

  /* ---------------------------------------------------------------- hook */

  window.__yw = {
    applyTheme: applyTheme,
    applyLang: applyLang
  };
})();
