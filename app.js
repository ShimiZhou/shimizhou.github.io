/* =============================================================
   Shimi Zhou — site interactions
   - mobile nav toggle
   - network constellation (hero, footer, page headers, news thumbs)
   - scroll reveal
   ============================================================= */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  /* ---------- mobile nav ---------- */
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      const open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
    });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { nav.setAttribute("data-open", "false"); });
    });
  }

  /* ---------- network constellation ----------
     Renders drifting nodes + proximity edges onto a canvas.
     opts: { density, hub (bool), palette } */
  function Constellation(canvas, opts) {
    opts = opts || {};
    const ctx = canvas.getContext("2d");
    const pal = opts.palette || {};
    const edge = pal.edge || "rgba(120,128,160,.5)";
    const node = pal.node || "#A87C2E";
    const nodeSoft = pal.nodeSoft || "rgba(168,124,46,.55)";
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes = [];
    let raf = null;

    function size() {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      const area = W * H;
      const target = Math.max(10, Math.min(46, Math.round(area / (opts.density || 9000))));
      nodes = [];
      for (let i = 0; i < target; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: 1.3 + Math.random() * 1.7,
          hub: false
        });
      }
      if (opts.hub && nodes.length) {
        // a couple of high-degree hub nodes near center (nods to centrality)
        const cx = W / 2, cy = H / 2;
        nodes[0].x = cx + (Math.random() - .5) * W * .12;
        nodes[0].y = cy + (Math.random() - .5) * H * .12;
        nodes[0].hub = true; nodes[0].r = 3.2;
        if (nodes[1]) { nodes[1].hub = true; nodes[1].r = 2.6; }
      }
    }

    const LINK = opts.link || 118;

    function frame() {
      ctx.clearRect(0, 0, W, H);
      // edges
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            const alpha = (1 - d / LINK);
            ctx.strokeStyle = edge;
            ctx.globalAlpha = alpha * (a.hub || b.hub ? 0.9 : 0.55);
            ctx.lineWidth = a.hub || b.hub ? 1 : 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      // nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.fillStyle = n.hub ? node : nodeSoft;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        if (n.hub) {
          ctx.beginPath();
          ctx.strokeStyle = node; ctx.globalAlpha = .35; ctx.lineWidth = 1;
          ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
      // motion
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
      }
      raf = requestAnimationFrame(frame);
    }

    size();
    if (reduce) { frame(); cancelAnimationFrame(raf); raf = null; } // draw one static frame
    else frame();

    let rz;
    window.addEventListener("resize", function () {
      clearTimeout(rz); rz = setTimeout(function () {
        dpr = Math.min(window.devicePixelRatio || 1, 2); size();
        if (reduce) { frame(); cancelAnimationFrame(raf); raf = null; }
      }, 180);
    });
  }

  // hero (light bg, gold hub)
  document.querySelectorAll("[data-net='hero']").forEach(function (c) {
    Constellation(c, { density: 5200, hub: true, link: 130,
      palette: { edge: "rgba(120,128,160,.45)", node: "#A87C2E", nodeSoft: "rgba(168,124,46,.6)" } });
  });
  // footer (dark bg, gold nodes)
  document.querySelectorAll("[data-net='footer']").forEach(function (c) {
    Constellation(c, { density: 11000, hub: false, link: 120,
      palette: { edge: "rgba(150,160,200,.35)", node: "#C79A45", nodeSoft: "rgba(199,154,69,.5)" } });
  });
  // page header accent (light bg)
  document.querySelectorAll("[data-net='head']").forEach(function (c) {
    Constellation(c, { density: 6500, hub: true, link: 120,
      palette: { edge: "rgba(120,128,160,.4)", node: "#A87C2E", nodeSoft: "rgba(168,124,46,.5)" } });
  });
  // news thumbnails (dark bg)
  document.querySelectorAll("[data-net='thumb']").forEach(function (c) {
    Constellation(c, { density: 6000, hub: false, link: 95,
      palette: { edge: "rgba(150,160,200,.4)", node: "#C79A45", nodeSoft: "rgba(199,154,69,.55)" } });
  });

  /* ---------- scroll reveal ---------- */
  const items = document.querySelectorAll(".reveal");
  if (items.length && !reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }
})();
