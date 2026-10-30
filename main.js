/* ============================================================
   Jason Duval · site script
   - draws the hero scene (stars, skyline, palm trees)
   - builds the video cards from videos.js
   - nav background, reveal on scroll, footer year
   ============================================================ */
(() => {
  "use strict";
  document.documentElement.classList.add("js");

  const MAX_VIDEOS = 6;
  const SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- small helpers ---------- */
  // Seeded random, so the scene looks the same on every visit.
  const seeded = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const r1 = (v) => Math.round(v * 10) / 10;
  const pt = (p) => r1(p[0]) + "," + r1(p[1]);

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // Point and unit tangent on a quadratic curve a -> c -> b.
  function quad(a, c, b, t) {
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  }
  function quadDir(a, c, b, t) {
    const u = 1 - t;
    const x = 2 * u * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
    const y = 2 * u * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  }

  // Filled ribbon along a curve, tapering from w0 to w1.
  function ribbon(a, c, b, w0, w1, steps, wobble = 0) {
    const left = [], right = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, p = quad(a, c, b, t), d = quadDir(a, c, b, t);
      const w = ((w0 + (w1 - w0) * t) / 2) * (1 + wobble * Math.sin(i * 2.4));
      left.push([p[0] - d[1] * w, p[1] + d[0] * w]);
      right.push([p[0] + d[1] * w, p[1] - d[0] * w]);
    }
    return "M" + left.map(pt).join("L") + "L" + right.reverse().map(pt).join("L") + "Z";
  }

  /* ---------- palm trees ---------- */
  function frondPath(crown, angle, len, rand) {
    const a = (angle * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
    const droop = len * (0.18 + 0.5 * (1 - Math.max(0, -dy)));
    const end = [crown[0] + dx * len * 0.92, crown[1] + dy * len * 0.92 + droop];
    const ctrl = [crown[0] + dx * len * 0.62, crown[1] + dy * len * 0.62 - len * 0.16];

    let d = ribbon(crown, ctrl, end, 7, 1, 16);
    for (let t = 0.07; t <= 1.001; t += 0.032) {
      const p = quad(crown, ctrl, end, t), g = quadDir(crown, ctrl, end, t);
      const env = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.55);
      const ll = len * 0.36 * env * (1 - 0.25 * t) + 5;
      for (const side of [-1, 1]) {
        const th = (side * (50 + rand() * 14) * Math.PI) / 180;
        let lx = g[0] * Math.cos(th) - g[1] * Math.sin(th);
        let ly = g[0] * Math.sin(th) + g[1] * Math.cos(th) + 0.6; // leaflets hang down
        const l = Math.hypot(lx, ly); lx /= l; ly /= l;
        const tip = [p[0] + lx * ll, p[1] + ly * ll];
        const mid = [(p[0] + tip[0]) / 2, (p[1] + tip[1]) / 2 + ll * 0.12];
        const b1 = [p[0] - g[0] * 2.4, p[1] - g[1] * 2.4];
        const b2 = [p[0] + g[0] * 2.4, p[1] + g[1] * 2.4];
        d += "M" + pt(b1) + "Q" + pt(mid) + " " + pt(tip) + "Q" + pt(mid) + " " + pt(b2) + "Z";
      }
    }
    return d;
  }

  const FRONDS = [-172, -150, -128, -104, -80, -56, -32, -10, 12, 192];

  function drawPalm(svg, o, rand) {
    const g = svgEl("g", o.far ? { class: "far" } : {});
    const ctrl = [(o.base[0] + o.crown[0]) / 2 + o.bend, (o.base[1] + o.crown[1]) / 2];
    g.appendChild(svgEl("path", { d: ribbon(o.base, ctrl, o.crown, o.w0, o.w1, 40, 0.07) }));

    for (const base of FRONDS) {
      const angle = base + (rand() - 0.5) * 12;
      const len = o.len * (0.88 + rand() * 0.24);
      const fg = svgEl("g", {
        class: "frond",
        style: `transform-origin:${o.crown[0]}px ${o.crown[1]}px;` +
               `animation-delay:${(-rand() * 7).toFixed(2)}s;animation-duration:${(6 + rand() * 3).toFixed(2)}s`,
      });
      fg.appendChild(svgEl("path", { d: frondPath(o.crown, angle, len, rand) }));
      g.appendChild(fg);
    }
    for (const [x, y] of [[-9, 10], [7, 12], [-1, 19]]) {
      g.appendChild(svgEl("circle", { cx: o.crown[0] + x, cy: o.crown[1] + y, r: o.w1 * 0.55 }));
    }
    svg.appendChild(g);
  }

  function drawPalms(id, seed, palms) {
    const svg = document.getElementById(id);
    if (!svg) return;
    const rand = seeded(seed);
    palms.forEach((p) => drawPalm(svg, p, rand));
  }

  /* ---------- skyline ---------- */
  function drawSkyline() {
    const svg = document.getElementById("skyline");
    if (!svg) return;
    const rand = seeded(907);
    const W = 1600, H = 180;
    const layers = [
      { fill: "#4A1752", opacity: 0.6, min: 34, max: 104, tall: 140, wMin: 26, wMax: 64, windows: false },
      { fill: "#1A0C26", opacity: 1, min: 14, max: 78, tall: 118, wMin: 20, wMax: 54, windows: true },
    ];

    for (const L of layers) {
      let x = -10, d = "", win = "";
      while (x < W + 10) {
        const w = L.wMin + rand() * (L.wMax - L.wMin);
        let h = L.min + Math.pow(rand(), 1.7) * (L.max - L.min);
        if (rand() < 0.1) h = L.tall * (0.85 + rand() * 0.15);
        const top = H - h, style = rand();

        d += `M${r1(x)},${H}V${r1(top)}`;
        if (style < 0.22 && w > 32) {        // stepped, art deco top
          d += `H${r1(x + w * 0.18)}V${r1(top - 7)}H${r1(x + w * 0.32)}V${r1(top - 14)}` +
               `H${r1(x + w * 0.68)}V${r1(top - 7)}H${r1(x + w * 0.82)}V${r1(top)}`;
        } else if (style < 0.34) {           // antenna
          d += `H${r1(x + w * 0.46)}V${r1(top - 24)}H${r1(x + w * 0.54)}V${r1(top)}`;
        } else if (style < 0.42) {           // pitched roof
          d += `L${r1(x + w / 2)},${r1(top - 14)}L${r1(x + w)},${r1(top)}`;
        }
        d += `H${r1(x + w)}V${H}Z`;

        if (L.windows) {
          for (let wy = top + 6; wy < H - 8; wy += 7) {
            for (let wx = x + 4; wx < x + w - 5; wx += 6) {
              if (rand() < 0.07) win += `M${r1(wx)},${r1(wy)}h2.2v3h-2.2Z`;
            }
          }
        }
        x += w + (rand() < 0.35 ? 2 + rand() * 12 : 0);
      }
      svg.appendChild(svgEl("path", { d, fill: L.fill, opacity: L.opacity }));
      if (win) svg.appendChild(svgEl("path", { d: win, fill: "#FFB46A", opacity: 0.6 }));
    }
  }

  /* ---------- stars ---------- */
  function drawStars() {
    const svg = document.getElementById("stars");
    if (!svg) return;
    const rand = seeded(42);
    for (let i = 0; i < 80; i++) {
      const twinkle = rand() < 0.3;
      const c = svgEl("circle", {
        cx: r1(rand() * 1600),
        cy: r1(Math.pow(rand(), 1.5) * 420),
        r: r1(0.6 + rand() * 1.1),
        opacity: r1(0.15 + rand() * 0.55),
      });
      if (twinkle) {
        c.setAttribute("class", "tw");
        c.style.animationDelay = (-rand() * 4).toFixed(2) + "s";
      }
      svg.appendChild(c);
    }
  }

  /* ---------- videos ---------- */
  function videoId(link) {
    const s = String(link || "").trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    const m = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  function videoCard(v, latest) {
    const a = document.createElement("a");
    a.className = "vcard";
    a.href = "https://www.youtube.com/watch?v=" + v.id;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("data-reveal", "");
    a.innerHTML =
      '<div class="vthumb">' +
        '<img alt="" loading="lazy" decoding="async" width="1280" height="720">' +
        '<span class="vplay"><svg class="i" aria-hidden="true"><use href="#i-play"/></svg></span>' +
        (latest ? '<span class="vnew">Latest</span>' : "") +
      "</div>" +
      '<div class="vbody">' +
        '<h3 class="vtitle"></h3>' +
        '<span class="vchan"><svg aria-hidden="true" viewBox="0 0 64 64"><use href="#mark"/></svg>Jason Duval</span>' +
        '<span class="vbtn">Watch on YouTube<svg class="i" aria-hidden="true"><use href="#i-arrow"/></svg></span>' +
      "</div>";
    a.querySelector(".vtitle").textContent = v.title || "New video";

    // Full-size thumbnail, falling back to the smaller one if it does not exist.
    const img = a.querySelector("img");
    const fallback = "https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg";
    const useFallback = () => { if (img.src !== fallback) img.src = fallback; };
    img.addEventListener("error", useFallback);
    img.addEventListener("load", () => { if (img.naturalWidth <= 120) useFallback(); });
    img.src = "https://i.ytimg.com/vi/" + v.id + "/maxresdefault.jpg";
    return a;
  }

  function renderVideos(list) {
    const grid = document.getElementById("video-grid");
    if (!grid) return;
    grid.textContent = "";
    const items = (Array.isArray(list) ? list : [])
      .map((v) => ({ id: videoId(v && (v.link || v.id)), title: v && (v.titolo || v.title) }))
      .filter((v) => v.id)
      .slice(0, MAX_VIDEOS);

    grid.classList.toggle("featured", items.length >= 3);
    if (!items.length) {
      grid.appendChild(document.getElementById("empty-tpl").content.cloneNode(true));
      return;
    }
    items.forEach((v, i) => grid.appendChild(videoCard(v, i === 0)));
  }

  /* ---------- page behaviour ---------- */
  function navOnScroll() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const update = () => nav.classList.toggle("scrolled", window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function reveal() {
    const items = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });

    items.forEach((el) => {
      const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute("data-reveal"));
      el.style.transitionDelay = Math.min(siblings.indexOf(el), 5) * 80 + "ms";
      io.observe(el);
    });
  }

  /* ---------- go ---------- */
  drawStars();
  drawSkyline();
  drawPalms("palm-l", 11, [
    { far: true, base: [120, 1010], crown: [70, 640], bend: 30, w0: 22, w1: 12, len: 150 },
    { base: [250, 1010], crown: [330, 420], bend: -60, w0: 30, w1: 15, len: 200 },
  ]);
  drawPalms("palm-r", 23, [
    { far: true, base: [110, 1010], crown: [40, 470], bend: 40, w0: 24, w1: 13, len: 170 },
    { base: [260, 1010], crown: [350, 230], bend: -70, w0: 34, w1: 16, len: 240 },
  ]);
  drawPalms("palm-cta", 5, [
    { far: true, base: [140, 1010], crown: [90, 560], bend: 30, w0: 24, w1: 13, len: 160 },
    { base: [270, 1010], crown: [340, 330], bend: -60, w0: 32, w1: 16, len: 220 },
  ]);
  renderVideos(window.VIDEOS);
  navOnScroll();
  reveal();

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
