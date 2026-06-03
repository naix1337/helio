# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Helio marketing landing page at `/`, converting the existing HTML prototype to React.

**Architecture:** Single `LandingPage.tsx` component with inline state for interactive elements (burger menu, FAQ accordion, copy button). CSS directly adapted from the prototype's `styles.css`. All interactions handled via `useEffect` / `useState` — no new libraries.

**Tech Stack:** React 18, lucide-react (already installed), existing CSS tokens

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/styles/landing.css` | Create | All landing-page-specific styles (layout, components, animations) |
| `frontend/src/pages/LandingPage.tsx` | Create | Full React landing page with all 10 sections |
| `frontend/src/App.tsx` | Modify | Add `/` route, remove redirect |

---

## Task 1: Landing CSS

**Files:**
- Create: `frontend/src/styles/landing.css`

- [ ] **Step 1: Create `landing.css`**

Copy the prototype CSS from `design_extracted/helio-landing/project/styles.css`, but **omit lines 1–114** (the `:root` and `[data-theme="light"]` token blocks — those already exist in `tokens.css`). Keep everything from `body { ... }` onwards. Prepend the two layout variables that `tokens.css` doesn't define:

```css
/* helio-app/frontend/src/styles/landing.css */
/* Layout variables not in tokens.css */
:root {
  --maxw: 1200px;
  --gut: clamp(20px, 5vw, 40px);
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 16px;
  transition: background-color 0.4s var(--ease), color 0.4s var(--ease);
}

/* ============================================================
   TYPE SCALE
   ============================================================ */
h1, h2, h3, h4 { line-height: 1.08; letter-spacing: -0.02em; font-weight: 650; color: var(--text); }
.display { font-size: clamp(2.6rem, 6vw, 4.4rem); font-weight: 680; letter-spacing: -0.03em; line-height: 1.02; }
.h2 { font-size: clamp(1.9rem, 3.6vw, 2.9rem); letter-spacing: -0.025em; }
.h3 { font-size: 1.25rem; letter-spacing: -0.015em; }
.lead { font-size: clamp(1.05rem, 1.6vw, 1.22rem); color: var(--text-muted); line-height: 1.6; }
.eyebrow {
  font-family: var(--font-mono);
  font-size: 0.78rem; font-weight: 500;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--primary);
  display: inline-flex; align-items: center; gap: 8px;
}
.eyebrow::before { content: ""; width: 22px; height: 1px; background: var(--primary); opacity: 0.6; }
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

/* ============================================================
   LAYOUT
   ============================================================ */
.container { width: 100%; max-width: var(--maxw); margin-inline: auto; padding-inline: var(--gut); }
section { position: relative; }
.section-pad { padding-block: clamp(72px, 11vw, 130px); }
.divider { border-top: 1px solid var(--border); }
.section-head { max-width: 660px; margin-bottom: clamp(40px, 6vw, 64px); }
.section-head.center { margin-inline: auto; text-align: center; }
.section-head.center .eyebrow { justify-content: center; }
.section-head .h2 { margin-top: 16px; }
.section-head .lead { margin-top: 18px; }

/* ============================================================
   BUTTONS
   ============================================================ */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  font-weight: 540; font-size: 0.95rem; letter-spacing: -0.01em;
  padding: 0 20px; height: 46px;
  border-radius: var(--radius); border: 1px solid transparent;
  cursor: pointer; white-space: nowrap;
  transition: background-color .17s var(--ease), border-color .17s var(--ease),
              color .17s var(--ease), transform .17s var(--ease), box-shadow .17s var(--ease);
}
.btn:active { transform: translateY(1px); }
.btn svg { width: 18px; height: 18px; }
.btn-primary {
  background: var(--primary); color: var(--primary-fg);
  box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 24px -10px var(--primary-glow);
}
.btn-primary:hover { background: var(--primary-hover); box-shadow: 0 0 0 4px var(--primary-soft), 0 10px 30px -10px var(--primary-glow); }
.btn-secondary {
  background: transparent; color: var(--text);
  border-color: var(--border-strong);
}
.btn-secondary:hover { background: var(--surface-2); border-color: var(--text-dim); }
.btn-sm { height: 38px; font-size: 0.88rem; padding-inline: 15px; }
.btn-lg { height: 52px; font-size: 1.02rem; padding-inline: 26px; }

/* ============================================================
   BADGES
   ============================================================ */
.badge {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: var(--font-mono); font-size: 0.74rem; font-weight: 500;
  padding: 4px 10px; border-radius: 100px;
  border: 1px solid var(--border); background: var(--surface-2);
  color: var(--text-muted); letter-spacing: 0.01em;
}
.badge .dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.dot-ok   { background: var(--ok); box-shadow: 0 0 0 3px var(--ok-soft); }
.dot-warn { background: var(--warn); box-shadow: 0 0 0 3px var(--warn-soft); }
.dot-down { background: var(--down); box-shadow: 0 0 0 3px var(--down-soft); }
.badge-status.ok   { color: var(--ok); border-color: var(--ok-soft); background: var(--ok-soft); }
.badge-status.warn { color: var(--warn); border-color: var(--warn-soft); background: var(--warn-soft); }
.badge-status.down { color: var(--down); border-color: var(--down-soft); background: var(--down-soft); }
.pulse { position: relative; }
.pulse::after {
  content: ""; position: absolute; inset: -3px; border-radius: 50%;
  border: 1px solid currentColor; opacity: 0.6;
  animation: pulse-ring 2.4s var(--ease) infinite;
}
@keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.7; } 80%,100% { transform: scale(2.4); opacity: 0; } }

/* ============================================================
   NAVBAR
   ============================================================ */
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  transition: background-color .3s var(--ease), border-color .3s var(--ease), backdrop-filter .3s;
  border-bottom: 1px solid transparent;
}
.nav.scrolled {
  background: var(--nav-bg);
  -webkit-backdrop-filter: saturate(150%) blur(14px);
  backdrop-filter: saturate(150%) blur(14px);
  border-bottom-color: var(--border);
}
.nav-inner { display: flex; align-items: center; gap: 28px; height: 70px; }
.brand { display: flex; align-items: center; gap: 11px; font-weight: 640; font-size: 1.12rem; letter-spacing: -0.02em; }
.brand-mark {
  width: 30px; height: 30px; border-radius: 9px; flex: none; position: relative;
  background: radial-gradient(circle at 30% 28%, var(--primary), #0e7d72 78%);
  box-shadow: 0 0 0 1px var(--border-strong), 0 6px 18px -6px var(--primary-glow);
}
.brand-mark::after {
  content: ""; position: absolute; inset: 8px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.85); border-right-color: transparent; border-bottom-color: transparent;
  transform: rotate(45deg);
}
.nav-links { display: flex; align-items: center; gap: 4px; margin-inline: auto; }
.nav-links a {
  color: var(--text-muted); font-size: 0.93rem; font-weight: 480;
  padding: 8px 13px; border-radius: 8px; transition: color .15s, background-color .15s;
  display: inline-flex; align-items: center; gap: 6px;
}
.nav-links a:hover { color: var(--text); background: var(--surface-2); }
.nav-links a svg { width: 15px; height: 15px; }
.nav-actions { display: flex; align-items: center; gap: 8px; }
.theme-toggle {
  width: 40px; height: 40px; border-radius: 9px; flex: none;
  display: grid; place-items: center; cursor: pointer;
  background: transparent; border: 1px solid var(--border);
  color: var(--text-muted); transition: all .15s;
}
.theme-toggle:hover { color: var(--text); border-color: var(--border-strong); background: var(--surface-2); }
.theme-toggle svg { width: 18px; height: 18px; }
.burger { display: none; width: 40px; height: 40px; border-radius: 9px; border: 1px solid var(--border);
  background: transparent; color: var(--text); cursor: pointer; place-items: center; }
.burger svg { width: 20px; height: 20px; }
.mobile-menu {
  position: fixed; inset: 70px 0 auto 0; z-index: 99;
  background: var(--nav-bg); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  padding: 16px var(--gut) 26px;
  display: none; flex-direction: column; gap: 4px;
  transform: translateY(-12px); opacity: 0; transition: opacity .22s var(--ease), transform .22s var(--ease);
}
.mobile-menu.open { display: flex; transform: none; opacity: 1; }
.mobile-menu a { padding: 13px 12px; border-radius: 9px; color: var(--text); font-weight: 480; font-size: 1.02rem; border-bottom: 1px solid var(--border); }
.mobile-menu a:last-of-type { border-bottom: none; }
.mobile-menu .btn { margin-top: 14px; width: 100%; }

/* ============================================================
   HERO
   ============================================================ */
.hero { padding-top: 150px; overflow: hidden; }
.hero-bg {
  position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none;
  background: radial-gradient(60% 50% at 50% -6%, var(--primary-soft), transparent 70%);
}
.hero-bg::before {
  content: ""; position: absolute; inset: 0;
  background-image: linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 54px 54px;
  -webkit-mask-image: radial-gradient(70% 60% at 50% 18%, #000 0%, transparent 78%);
  mask-image: radial-gradient(70% 60% at 50% 18%, #000 0%, transparent 78%);
}
.hero-inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 26px; }
.gh-pill {
  display: inline-flex; align-items: center; gap: 0;
  border: 1px solid var(--border); border-radius: 100px; background: var(--surface);
  font-size: 0.82rem; overflow: hidden; box-shadow: var(--shadow-sm);
}
.gh-pill .gh-l { display: flex; align-items: center; gap: 7px; padding: 6px 13px; color: var(--text-muted); }
.gh-pill .gh-l svg { width: 15px; height: 15px; }
.gh-pill .gh-r { display: flex; align-items: center; gap: 6px; padding: 6px 13px; border-left: 1px solid var(--border);
  color: var(--text); font-family: var(--font-mono); font-weight: 500; background: var(--surface-2); }
.gh-pill .gh-r svg { width: 14px; height: 14px; color: var(--warn); }
.hero h1 { max-width: 16ch; }
.hero h1 .accent { color: var(--primary); }
.hero .lead { max-width: 56ch; }
.hero-cta { display: flex; gap: 13px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }
.hero-note { font-size: 0.83rem; color: var(--text-dim); display: flex; align-items: center; gap: 8px; }
.hero-note svg { width: 15px; height: 15px; color: var(--ok); }
.mockup-wrap { width: 100%; max-width: 1020px; margin-top: 30px; perspective: 1800px; }
.mockup {
  border: 1px solid var(--border-strong); border-radius: var(--radius-lg);
  background: var(--surface); box-shadow: var(--shadow-lg);
  overflow: hidden; text-align: left;
}
.mockup-bar {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  border-bottom: 1px solid var(--border); background: var(--surface-2);
}
.traffic { display: flex; gap: 7px; }
.traffic i { width: 11px; height: 11px; border-radius: 50%; background: var(--surface-3); border: 1px solid var(--border-strong); }
.mockup-url {
  flex: 1; max-width: 320px; font-family: var(--font-mono); font-size: 0.74rem; color: var(--text-dim);
  background: var(--bg); border: 1px solid var(--border); border-radius: 7px; padding: 5px 12px;
  display: flex; align-items: center; gap: 7px;
}
.mockup-url svg { width: 12px; height: 12px; color: var(--ok); }
.mockup-body { display: grid; grid-template-columns: 200px 1fr; min-height: 380px; }
.mock-side { border-right: 1px solid var(--border); padding: 16px 12px; background: var(--bg-soft); display: flex; flex-direction: column; gap: 3px; }
.mock-side .si { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 8px; font-size: 0.85rem; color: var(--text-muted); }
.mock-side .si svg { width: 16px; height: 16px; }
.mock-side .si.active { background: var(--primary-soft); color: var(--primary); font-weight: 500; }
.mock-side .si-label { font-family: var(--font-mono); font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-dim); padding: 14px 11px 6px; }
.mock-main { padding: 18px 20px; display: flex; flex-direction: column; gap: 16px; }
.mock-h { display: flex; align-items: center; justify-content: space-between; }
.mock-h h4 { font-size: 1.05rem; }
.mock-h .sub { font-size: 0.78rem; color: var(--text-dim); font-family: var(--font-mono); }
.mock-stats { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
.stat-card { border: 1px solid var(--border); border-radius: var(--radius); padding: 13px 14px; background: var(--surface-2); }
.stat-card .lbl { font-size: 0.72rem; color: var(--text-dim); display: flex; align-items: center; justify-content: space-between; }
.stat-card .lbl .t { color: var(--ok); font-family: var(--font-mono); }
.stat-card .val { font-family: var(--font-mono); font-size: 1.5rem; font-weight: 600; margin-top: 6px; letter-spacing: -0.02em; }
.stat-card .val small { font-size: 0.8rem; color: var(--text-dim); font-weight: 400; }
.spark { margin-top: 8px; }
.bars { display: flex; align-items: flex-end; gap: 4px; height: 38px; margin-top: 10px; }
.bars i { flex: 1; background: var(--violet); border-radius: 2px 2px 0 0; opacity: 0.85; }
.mock-servers { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.srow { display: grid; grid-template-columns: 1fr auto auto auto; align-items: center; gap: 14px; padding: 11px 14px; border-bottom: 1px solid var(--border); font-size: 0.83rem; }
.srow:last-child { border-bottom: none; }
.srow .name { display: flex; align-items: center; gap: 9px; font-weight: 460; }
.srow .name .nm { font-family: var(--font-mono); font-size: 0.78rem; }
.srow .meta { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-dim); }

/* ============================================================
   TRUSTED BY
   ============================================================ */
.trusted { padding-block: 46px; }
.trusted p { text-align: center; font-size: 0.8rem; color: var(--text-dim); font-family: var(--font-mono); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 26px; }
.logo-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: clamp(28px, 6vw, 64px); }
.logo-ph { display: flex; align-items: center; gap: 10px; color: var(--text-dim); opacity: 0.62; font-weight: 600; font-size: 1.05rem; letter-spacing: -0.02em; transition: opacity .2s, color .2s; filter: grayscale(1); }
.logo-ph:hover { opacity: 1; color: var(--text-muted); }
.logo-ph .lm { width: 22px; height: 22px; border-radius: 5px; background: currentColor; opacity: 0.7; flex: none; }
.logo-ph .lm.circle { border-radius: 50%; }
.logo-ph .lm.diamond { border-radius: 4px; transform: rotate(45deg); }

/* ============================================================
   FEATURE GRID
   ============================================================ */
.feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.feat-card {
  position: relative; border: 1px solid var(--border); border-radius: var(--radius-lg);
  background: var(--surface); padding: 26px; overflow: hidden;
  transition: border-color .2s var(--ease), transform .2s var(--ease), background-color .2s;
}
.feat-card::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none;
  background: radial-gradient(180px 120px at var(--mx,50%) var(--my,0%), var(--primary-glow), transparent 70%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: 0; transition: opacity .25s;
}
.feat-card:hover { transform: translateY(-3px); border-color: var(--border-strong); }
.feat-card:hover::before { opacity: 1; }
.feat-ico { width: 44px; height: 44px; border-radius: 11px; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); margin-bottom: 18px; border: 1px solid var(--border); }
.feat-ico svg { width: 21px; height: 21px; }
.feat-card.v .feat-ico { background: var(--violet-soft); color: var(--violet); }
.feat-card h3 { margin-bottom: 9px; }
.feat-card p { font-size: 0.94rem; color: var(--text-muted); }

/* ============================================================
   SPLIT HIGHLIGHTS
   ============================================================ */
.split { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(40px, 6vw, 84px); align-items: center; }
.split + .split { margin-top: clamp(72px, 10vw, 120px); }
.split.rev .split-text { order: 2; }
.split-text .h2 { margin: 16px 0 18px; }
.split-list { margin-top: 26px; display: flex; flex-direction: column; gap: 16px; }
.split-list li { display: flex; gap: 13px; align-items: flex-start; }
.split-list .ci { width: 24px; height: 24px; border-radius: 7px; flex: none; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); margin-top: 1px; }
.split-list .ci svg { width: 14px; height: 14px; }
.split-list b { font-weight: 560; color: var(--text); display: block; font-size: 0.96rem; }
.split-list span { color: var(--text-muted); font-size: 0.9rem; }
.panel { border: 1px solid var(--border-strong); border-radius: var(--radius-lg); background: var(--surface); box-shadow: var(--shadow-md); overflow: hidden; }
.panel-head { padding: 13px 16px; border-bottom: 1px solid var(--border); background: var(--surface-2); display: flex; align-items: center; justify-content: space-between; }
.panel-head .pt { font-weight: 540; font-size: 0.9rem; display: flex; align-items: center; gap: 9px; }
.panel-head .pt svg { width: 16px; height: 16px; color: var(--primary); }
.panel-body { padding: 18px; }
.alert-item { display: flex; gap: 13px; padding: 13px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface-2); margin-bottom: 10px; }
.alert-item:last-child { margin-bottom: 0; }
.alert-item .ai-ico { width: 32px; height: 32px; border-radius: 8px; flex: none; display: grid; place-items: center; }
.alert-item .ai-ico svg { width: 16px; height: 16px; }
.alert-item.down .ai-ico { background: var(--down-soft); color: var(--down); }
.alert-item.warn .ai-ico { background: var(--warn-soft); color: var(--warn); }
.alert-item.ok .ai-ico { background: var(--ok-soft); color: var(--ok); }
.alert-item .ai-main { flex: 1; min-width: 0; }
.alert-item .ai-t { font-size: 0.86rem; font-weight: 500; }
.alert-item .ai-d { font-size: 0.78rem; color: var(--text-dim); font-family: var(--font-mono); margin-top: 2px; }
.alert-item .ai-time { font-size: 0.72rem; color: var(--text-dim); font-family: var(--font-mono); white-space: nowrap; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.chip { font-family: var(--font-mono); font-size: 0.72rem; padding: 5px 10px; border-radius: 7px; border: 1px solid var(--border); color: var(--text-muted); background: var(--bg); display: inline-flex; align-items: center; gap: 6px; }
.chip svg { width: 13px; height: 13px; }
.term { background: var(--bg); border-radius: var(--radius); border: 1px solid var(--border); overflow: hidden; font-family: var(--font-mono); font-size: 0.8rem; }
.term-line { padding: 4px 14px; display: flex; gap: 10px; color: var(--text-muted); }
.term-line:first-child { padding-top: 14px; }
.term-line:last-child { padding-bottom: 14px; }
.term-line .pr { color: var(--primary); }
.term-line .cm { color: var(--text); }
.term-line.out { color: var(--text-dim); padding-left: 24px; }
.term-line.out .g { color: var(--ok); }

/* ============================================================
   LIVE DEMO
   ============================================================ */
.live { background: var(--bg-soft); border-block: 1px solid var(--border); }
.live-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 12px; }
.live-card { border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); padding: 26px; text-align: center; }
.live-card .lc-ico { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; margin: 0 auto 16px; background: var(--primary-soft); color: var(--primary); }
.live-card .lc-ico svg { width: 18px; height: 18px; }
.live-num { font-family: var(--font-mono); font-size: clamp(2rem, 4vw, 2.8rem); font-weight: 640; letter-spacing: -0.03em; line-height: 1; }
.live-num .u { color: var(--primary); }
.live-card .lc-lbl { color: var(--text-muted); font-size: 0.88rem; margin-top: 10px; }
.live-status { display: flex; align-items: center; justify-content: center; gap: 9px; margin-top: 30px; font-size: 0.86rem; color: var(--text-muted); }
.live-status .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--ok); position: relative; }
.live-status .dot::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--ok); animation: live-pulse 2s ease-out infinite; }
@keyframes live-pulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(3.2); opacity: 0; } }

/* ============================================================
   PRICING
   ============================================================ */
.price-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: start; }
.price-card { position: relative; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); padding: 30px 26px; display: flex; flex-direction: column; transition: border-color .2s, transform .2s; }
.price-card:hover { border-color: var(--border-strong); }
.price-card.feat { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary), 0 30px 80px -34px var(--primary-glow); }
.price-card.feat::before { content: ""; position: absolute; inset: 0; border-radius: inherit; z-index: -1; background: radial-gradient(120% 80% at 50% 0%, var(--primary-soft), transparent 60%); }
.price-pop { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--primary); color: var(--primary-fg); font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 5px 13px; border-radius: 100px; box-shadow: 0 6px 18px -6px var(--primary-glow); }
.price-name { font-size: 1.1rem; font-weight: 600; }
.price-desc { color: var(--text-muted); font-size: 0.86rem; margin-top: 6px; min-height: 40px; }
.price-amt { margin-top: 18px; display: flex; align-items: baseline; gap: 6px; }
.price-amt .num { font-family: var(--font-mono); font-size: 2.6rem; font-weight: 660; letter-spacing: -0.03em; }
.price-amt .per { color: var(--text-dim); font-size: 0.85rem; }
.price-card .btn { margin-top: 22px; width: 100%; }
.price-feats { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; padding-top: 22px; border-top: 1px solid var(--border); }
.price-feats li { display: flex; gap: 11px; align-items: flex-start; font-size: 0.9rem; color: var(--text-muted); }
.price-feats .ck { width: 18px; height: 18px; flex: none; color: var(--primary); margin-top: 1px; }
.price-feats .ck svg { width: 18px; height: 18px; }

/* ============================================================
   FAQ
   ============================================================ */
.faq { max-width: 800px; margin-inline: auto; }
.faq-item { border-bottom: 1px solid var(--border); }
.faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 24px 4px; cursor: pointer; background: none; border: none; text-align: left; font-size: 1.06rem; font-weight: 520; color: var(--text); transition: color .15s; }
.faq-q:hover { color: var(--primary); }
.faq-q .pm { width: 22px; height: 22px; flex: none; position: relative; color: var(--text-dim); transition: transform .3s var(--ease), color .15s; }
.faq-q .pm::before, .faq-q .pm::after { content: ""; position: absolute; background: currentColor; border-radius: 2px; }
.faq-q .pm::before { top: 50%; left: 3px; right: 3px; height: 2px; transform: translateY(-50%); }
.faq-q .pm::after { left: 50%; top: 3px; bottom: 3px; width: 2px; transform: translateX(-50%); transition: opacity .3s, transform .3s; }
.faq-item.open .faq-q { color: var(--primary); }
.faq-item.open .pm { color: var(--primary); transform: rotate(180deg); }
.faq-item.open .pm::after { opacity: 0; transform: translateX(-50%) scaleY(0); }
.faq-a { overflow: hidden; height: 0; transition: height .32s var(--ease); }
.faq-a-inner { padding: 0 4px 24px; color: var(--text-muted); font-size: 0.97rem; max-width: 68ch; }

/* ============================================================
   FINAL CTA
   ============================================================ */
.cta { text-align: center; position: relative; overflow: hidden; }
.cta-box { position: relative; border: 1px solid var(--border-strong); border-radius: var(--radius-xl); background: var(--surface); padding: clamp(48px, 8vw, 84px) var(--gut); box-shadow: var(--shadow-md); overflow: hidden; }
.cta-box::before { content: ""; position: absolute; inset: 0; z-index: 0; background: radial-gradient(60% 90% at 50% 0%, var(--primary-soft), transparent 62%); }
.cta-box > * { position: relative; z-index: 1; }
.cta-box .h2 { max-width: 18ch; margin-inline: auto; }
.cta-box .lead { max-width: 50ch; margin: 18px auto 30px; }
.cta-actions { display: flex; gap: 13px; justify-content: center; flex-wrap: wrap; }
.code-snip { display: inline-flex; align-items: stretch; margin-top: 30px; max-width: 100%; border: 1px solid var(--border-strong); border-radius: var(--radius); background: var(--bg); overflow: hidden; box-shadow: var(--shadow-sm); }
.code-snip code { font-family: var(--font-mono); font-size: 0.86rem; color: var(--text); padding: 13px 16px; display: flex; align-items: center; gap: 10px; white-space: nowrap; overflow-x: auto; }
.code-snip code .pr { color: var(--primary); }
.copy-btn { flex: none; border: none; border-left: 1px solid var(--border); background: var(--surface-2); color: var(--text-muted); width: 48px; cursor: pointer; display: grid; place-items: center; transition: color .15s, background-color .15s; }
.copy-btn:hover { color: var(--text); background: var(--surface-3); }
.copy-btn svg { width: 17px; height: 17px; }

/* ============================================================
   FOOTER
   ============================================================ */
.footer { border-top: 1px solid var(--border); padding-block: 64px 36px; background: var(--bg-soft); }
.footer-top { display: grid; grid-template-columns: 1.6fr repeat(4, 1fr); gap: 36px; }
.footer-brand { max-width: 280px; }
.footer-brand .brand { margin-bottom: 14px; }
.footer-brand p { color: var(--text-muted); font-size: 0.9rem; }
.footer-social { display: flex; gap: 10px; margin-top: 20px; }
.footer-social a { width: 36px; height: 36px; border-radius: 9px; border: 1px solid var(--border); display: grid; place-items: center; color: var(--text-muted); transition: all .15s; }
.footer-social a:hover { color: var(--text); border-color: var(--border-strong); background: var(--surface-2); }
.footer-social svg { width: 17px; height: 17px; }
.footer-col h5 { font-size: 0.78rem; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-dim); margin-bottom: 16px; font-weight: 500; }
.footer-col ul { display: flex; flex-direction: column; gap: 11px; }
.footer-col a { color: var(--text-muted); font-size: 0.9rem; transition: color .15s; }
.footer-col a:hover { color: var(--text); }
.footer-bottom { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-top: 52px; padding-top: 26px; border-top: 1px solid var(--border); }
.footer-bottom p { color: var(--text-dim); font-size: 0.84rem; }
.footer-bottom .fb-status { display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); }

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
.reveal { opacity: 0; transform: translateY(22px); transition: opacity .7s var(--ease), transform .7s var(--ease); }
.reveal.in { opacity: 1; transform: none; }
.reveal.d1 { transition-delay: .07s; } .reveal.d2 { transition-delay: .14s; }
.reveal.d3 { transition-delay: .21s; } .reveal.d4 { transition-delay: .28s; }
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
  * { animation-duration: 0.001ms !important; scroll-behavior: auto; }
}

/* ============================================================
   RESPONSIVE
   ============================================================ */
@media (max-width: 1000px) {
  .feat-grid { grid-template-columns: repeat(2, 1fr); }
  .live-grid { grid-template-columns: repeat(2, 1fr); }
  .footer-top { grid-template-columns: 1fr 1fr; gap: 32px; }
  .footer-brand { grid-column: 1 / -1; max-width: none; }
}
@media (max-width: 860px) {
  .nav-links { display: none; }
  .burger { display: grid; }
  .split { grid-template-columns: 1fr; gap: 36px; }
  .split.rev .split-text { order: 0; }
  .price-grid { grid-template-columns: 1fr; max-width: 440px; margin-inline: auto; }
  .price-card.feat { order: -1; }
  .mockup-body { grid-template-columns: 1fr; }
  .mock-side { display: none; }
}
@media (max-width: 600px) {
  .feat-grid { grid-template-columns: 1fr; }
  .live-grid { grid-template-columns: 1fr 1fr; }
  .footer-top { grid-template-columns: 1fr 1fr; }
  .mock-stats { grid-template-columns: 1fr; }
  .hero { padding-top: 120px; }
}
```

- [ ] **Step 2: Verify no token conflicts**

Run:
```bash
cd helio-app/frontend && npx tsc --noEmit
```
Expected: no output (no errors)

---

## Task 2: LandingPage Component

**Files:**
- Create: `frontend/src/pages/LandingPage.tsx`

- [ ] **Step 1: Create the component**

```tsx
// helio-app/frontend/src/pages/LandingPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Server, Box, Bell, Activity, Settings, Users,
  Lock, Moon, Sun, Menu, Play, CheckCircle2, Star,
  LineChart, BellRing, ShieldCheck, Globe, Network,
  Check, AlertOctagon, AlertTriangle, Mail, MessageSquare,
  Terminal, Cpu, Zap, Gauge, HardDrive, BookOpen, Copy,
  MessageCircle, Rss,
} from 'lucide-react';
import '../styles/landing.css';

const GH_ICON = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" aria-hidden="true">
    <path d="M12 .5C5.73.5.5 5.73.5 12.18c0 5.16 3.35 9.53 8 11.08.58.11.79-.26.79-.57v-2.2c-3.26.72-3.95-1.4-3.95-1.4-.53-1.36-1.3-1.72-1.3-1.72-1.06-.74.08-.72.08-.72 1.18.08 1.8 1.23 1.8 1.23 1.04 1.82 2.74 1.3 3.41.99.1-.77.41-1.3.74-1.6-2.6-.3-5.34-1.32-5.34-5.87 0-1.3.46-2.36 1.22-3.19-.12-.3-.53-1.51.12-3.15 0 0 1-.32 3.3 1.22a11.4 11.4 0 0 1 6 0c2.28-1.54 3.29-1.22 3.29-1.22.65 1.64.24 2.85.12 3.15.76.83 1.21 1.89 1.21 3.19 0 4.56-2.75 5.56-5.36 5.86.42.37.8 1.1.8 2.22v3.29c0 .31.21.69.8.57 4.65-1.55 8-5.92 8-11.08C23.5 5.73 18.27.5 12 .5z"/>
  </svg>
);
const X_ICON = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817-5.97 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
  </svg>
);

const FAQ_ITEMS = [
  { q: 'Muss ich Helio wirklich selbst hosten?', a: 'Ja — und genau das ist der Punkt. Helio läuft vollständig auf deiner eigenen Infrastruktur, sodass deine Metriken niemals einen fremden Server erreichen. Du brauchst nur Docker oder ein einzelnes Binary; eine externe Datenbank ist nicht erforderlich.' },
  { q: 'Wie unterscheidet sich Helio von Grafana oder Uptime Kuma?', a: 'Helio kombiniert Metrik-Erfassung, Alerting und Status-Pages in einem einzigen Tool — ohne dass du Prometheus, Grafana und einen Uptime-Checker separat betreiben und verbinden musst. Der Fokus liegt auf einfacher Einrichtung und einem schlanken Footprint von rund 42 MB RAM.' },
  { q: 'Welche Systeme und Plattformen werden unterstützt?', a: 'Linux (x86-64 & ARM, inkl. Raspberry Pi), Docker und Kubernetes. Agents laufen auf praktisch jedem Host; das Dashboard funktioniert in jedem modernen Browser. macOS- und Windows-Hosts werden über den Agent ebenfalls überwacht.' },
  { q: 'Ist Helio wirklich Open Source?', a: 'Ja. Der Kern von Helio steht unter der Apache-2.0-Lizenz und ist vollständig auf GitHub einsehbar. Die kostenpflichtigen Pläne fügen lediglich gehostete Komfortfunktionen und Team-Features hinzu — die self-hosted Variante bleibt für immer frei.' },
  { q: 'Wie funktioniert das Alerting genau?', a: 'Du definierst Regeln auf Basis von Schwellwerten oder Ausfällen und ordnest ihnen Kanäle zu — Webhook, E-Mail, Slack, Discord, Telegram oder PagerDuty. Eskalationsstufen, Ruhezeiten und automatisches Auto-Resolve sind eingebaut, und Alarme werden gruppiert, um Benachrichtigungs-Spam zu vermeiden.' },
  { q: 'Kann ich von einem anderen Tool migrieren?', a: 'In den meisten Fällen ja. Helio importiert Prometheus-kompatible Metriken und kann bestehende Uptime-Checks übernehmen. Unsere Docs enthalten Schritt-für-Schritt-Anleitungen für die gängigsten Setups.' },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const faqRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Nav scroll state
  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 12);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth > 860) setMenuOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    const show = (el: HTMLElement) => el.classList.add('in');
    if (reduce) { reveals.forEach(show); return; }

    const markInView = () => {
      const vh = window.innerHeight;
      reveals.forEach(el => {
        if (el.classList.contains('in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) show(el);
      });
    };
    markInView();

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        entries => entries.forEach(en => { if (en.isIntersecting) { show(en.target as HTMLElement); io.unobserve(en.target); } }),
        { threshold: 0.1, rootMargin: '0px 0px -6% 0px' }
      );
      reveals.forEach(el => { if (!el.classList.contains('in')) io.observe(el); });
      return () => io.disconnect();
    }
    window.addEventListener('scroll', markInView, { passive: true });
    return () => window.removeEventListener('scroll', markInView);
  }, []);

  // Animated counters
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));
    const setFinal = (el: HTMLElement) => {
      const d = parseInt(el.dataset.decimals ?? '0', 10);
      el.textContent = parseFloat(el.dataset.count!).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
    };
    if (reduce) { counters.forEach(setFinal); return; }

    const animate = (el: HTMLElement) => {
      const target = parseFloat(el.dataset.count!);
      const decimals = parseInt(el.dataset.decimals ?? '0', 10);
      const dur = 1700;
      const start = performance.now();
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const frame = (now: number) => {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = (target * ease(p)).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        if (p < 1) requestAnimationFrame(frame);
        else setFinal(el);
      };
      requestAnimationFrame(frame);
    };

    if ('IntersectionObserver' in window) {
      const cio = new IntersectionObserver(
        entries => entries.forEach(en => { if (en.isIntersecting && !en.target.getAttribute('data-done')) { (en.target as HTMLElement).dataset.done = '1'; animate(en.target as HTMLElement); cio.unobserve(en.target); } }),
        { threshold: 0.5 }
      );
      counters.forEach(el => cio.observe(el));
      return () => cio.disconnect();
    }
  }, []);

  // Feature card pointer glow
  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.feat-card'));
    const handlers: [HTMLElement, (e: PointerEvent) => void][] = cards.map(c => {
      const h = (e: PointerEvent) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        c.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      };
      c.addEventListener('pointermove', h);
      return [c, h];
    });
    return () => handlers.forEach(([c, h]) => c.removeEventListener('pointermove', h));
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem('helio-theme', next);
  };

  const toggleFaq = (i: number) => {
    const el = faqRefs.current[i];
    if (!el) return;
    if (openFaq === i) {
      el.style.height = el.scrollHeight + 'px';
      requestAnimationFrame(() => { el.style.height = '0px'; });
      setOpenFaq(null);
    } else {
      if (openFaq !== null && faqRefs.current[openFaq]) {
        faqRefs.current[openFaq]!.style.height = '0px';
      }
      setOpenFaq(i);
      el.style.height = el.scrollHeight + 'px';
      el.addEventListener('transitionend', function te() {
        if (openFaq !== i) el.style.height = 'auto';
        el.removeEventListener('transitionend', te);
      });
    }
  };

  const handleCopy = async () => {
    const text = 'curl -fsSL helio.sh/install | sh';
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea'); ta.value = text;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      {/* NAVBAR */}
      <header className={`nav${navScrolled ? ' scrolled' : ''}`}>
        <div className="container nav-inner">
          <a href="#top" className="brand">
            <span className="brand-mark" aria-hidden="true" />
            Helio
          </a>
          <nav className="nav-links" aria-label="Hauptnavigation">
            <a href="#features">Features</a>
            <a href="#preise">Preise</a>
            <a href="#docs">Docs</a>
            <a href="#github"><GH_ICON />GitHub</a>
          </nav>
          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Farbschema wechseln">
              <Moon size={18} className="icon-moon" />
              <Sun size={18} className="icon-sun" />
            </button>
            <Link to="/dashboard" className="btn btn-primary btn-sm">Jetzt starten</Link>
            <button className="burger" aria-label="Menü öffnen" aria-expanded={menuOpen}
              onClick={() => setMenuOpen(v => !v)}>
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <nav className={`mobile-menu${menuOpen ? ' open' : ''}`} aria-label="Mobile Navigation">
        <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
        <a href="#preise" onClick={() => setMenuOpen(false)}>Preise</a>
        <a href="#docs" onClick={() => setMenuOpen(false)}>Docs</a>
        <a href="#github" onClick={() => setMenuOpen(false)}>GitHub</a>
        <Link to="/dashboard" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Jetzt starten</Link>
      </nav>

      <main id="top">

        {/* HERO */}
        <section className="hero section-pad">
          <div className="hero-bg" aria-hidden="true" />
          <div className="container hero-inner">
            <a href="#github" className="gh-pill reveal">
              <span className="gh-l"><GH_ICON />helio/helio</span>
              <span className="gh-r"><Star size={14} />8.247</span>
            </a>
            <h1 className="display reveal d1">
              Monitoring, das dir gehört.<br /><span className="accent">Auf deinem Server.</span>
            </h1>
            <p className="lead reveal d2">
              Helio überwacht Server, Container und Dienste in Echtzeit — komplett self-hosted, Open Source und ohne Cloud-Zwang. Metriken, Alerting und Status-Pages in einem schlanken Binary.
            </p>
            <div className="hero-cta reveal d3">
              <Link to="/dashboard" className="btn btn-primary btn-lg">Kostenlos hosten</Link>
              <a href="#demo" className="btn btn-secondary btn-lg"><Play size={18} />Demo ansehen</a>
            </div>
            <p className="hero-note reveal d3"><CheckCircle2 size={15} />Ein Binary · keine Datenbank nötig · in unter 60 Sekunden live</p>

            <div className="mockup-wrap reveal d4">
              <div className="mockup">
                <div className="mockup-bar">
                  <span className="traffic" aria-hidden="true"><i /><i /><i /></span>
                  <span className="mockup-url"><Lock size={12} />helio.dein-server.de/dashboard</span>
                </div>
                <div className="mockup-body">
                  <aside className="mock-side">
                    <div className="si active"><LayoutDashboard size={16} />Übersicht</div>
                    <div className="si"><Server size={16} />Nodes</div>
                    <div className="si"><Box size={16} />Container</div>
                    <div className="si"><Bell size={16} />Alerts</div>
                    <div className="si"><Activity size={16} />Status-Page</div>
                    <div className="si-label">System</div>
                    <div className="si"><Settings size={16} />Einstellungen</div>
                    <div className="si"><Users size={16} />Team</div>
                  </aside>
                  <div className="mock-main">
                    <div className="mock-h">
                      <h4>Übersicht</h4>
                      <span className="sub">Letzte 24 h · live</span>
                    </div>
                    <div className="mock-stats">
                      <div className="stat-card">
                        <div className="lbl"><span>CPU-Auslastung</span><span className="t up">↘ 4,2 %</span></div>
                        <div className="val">37,4<small> %</small></div>
                        <svg className="spark" viewBox="0 0 280 56" preserveAspectRatio="none" width="100%" height="48" aria-hidden="true">
                          <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.35"/>
                            <stop offset="1" stopColor="var(--primary)" stopOpacity="0"/>
                          </linearGradient></defs>
                          <path d="M0,40 L24,36 48,42 72,30 96,33 120,22 144,28 168,18 192,26 216,14 240,20 264,12 280,16 L280,56 L0,56 Z" fill="url(#g1)"/>
                          <path d="M0,40 L24,36 48,42 72,30 96,33 120,22 144,28 168,18 192,26 216,14 240,20 264,12 280,16" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="stat-card">
                        <div className="lbl"><span>Arbeitsspeicher</span><span className="t">12,1 / 32 GB</span></div>
                        <div className="val">38<small> %</small></div>
                        <div className="bars" aria-hidden="true">
                          <i style={{height:'42%'}}/><i style={{height:'55%'}}/><i style={{height:'48%'}}/><i style={{height:'67%'}}/>
                          <i style={{height:'60%'}}/><i style={{height:'72%'}}/><i style={{height:'51%'}}/><i style={{height:'80%'}}/>
                          <i style={{height:'64%'}}/><i style={{height:'58%'}}/><i style={{height:'74%'}}/><i style={{height:'46%'}}/>
                        </div>
                      </div>
                    </div>
                    <div className="mock-servers">
                      {[
                        {nm:'web-01', sla:'99,99 % SLA', ms:'24', status:'ok', label:'online'},
                        {nm:'db-primary', sla:'99,97 % SLA', ms:'11', status:'ok', label:'online'},
                        {nm:'cache-02', sla:'98,40 % SLA', ms:'86', status:'warn', label:'latenz'},
                        {nm:'worker-eu-1', sla:'99,95 % SLA', ms:'32', status:'ok', label:'online'},
                      ].map(s => (
                        <div key={s.nm} className="srow">
                          <span className="name"><span className={`dot dot-${s.status}${s.status==='ok'?' pulse':''}`} /><span className="nm">{s.nm}</span></span>
                          <span className="meta">{s.sla}</span>
                          <span className="meta">{s.ms}ms</span>
                          <span className={`badge badge-status ${s.status}`}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUSTED BY */}
        <section className="trusted divider">
          <div className="container">
            <p className="reveal">Vertraut von Homelabs &amp; Teams weltweit</p>
            <div className="logo-row reveal d1">
              {[
                {name:'Nimbus', shape:'circle'},
                {name:'Forgelab', shape:''},
                {name:'OctaHosting', shape:'diamond'},
                {name:'kern.io', shape:'circle'},
                {name:'Stratus', shape:''},
                {name:'HomeRack', shape:'diamond'},
              ].map(l => (
                <span key={l.name} className="logo-ph">
                  <span className={`lm${l.shape ? ' '+l.shape : ''}`} />
                  {l.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section-pad divider" id="features">
          <div className="container">
            <div className="section-head center">
              <span className="eyebrow reveal">Funktionen</span>
              <h2 className="h2 reveal d1">Alles, was du zum Überwachen brauchst</h2>
              <p className="lead reveal d2">Ein einziges Tool für Metriken, Alarme und Transparenz — ohne fünf verschiedene Dienste zusammenzukleben.</p>
            </div>
            <div className="feat-grid">
              {[
                {icon:<LineChart/>, title:'Echtzeit-Metriken', text:'CPU, RAM, Disk, Netzwerk und I/O im Sekundentakt. Sauber gerenderte Charts mit historischen Daten und frei wählbaren Zeitfenstern.', v:false, delay:''},
                {icon:<BellRing/>, title:'Alerting', text:'Regelbasierte Alarme per Webhook, E-Mail, Slack oder Discord. Definiere Schwellwerte, Eskalationen und Ruhezeiten exakt nach Bedarf.', v:false, delay:'d1'},
                {icon:<Box/>, title:'Docker-Integration', text:'Container werden automatisch erkannt. Pro-Container-Metriken, Logs und Health-Checks — ganz ohne manuelle Konfiguration.', v:true, delay:'d2'},
                {icon:<ShieldCheck/>, title:'Self-Hosted & Privacy-First', text:'Deine Daten verlassen nie deinen Server. Keine Telemetrie, keine Account-Pflicht, keine Cloud-Abhängigkeit — du behältst die Kontrolle.', v:false, delay:''},
                {icon:<Globe/>, title:'Status-Page', text:'Öffentliche oder interne Status-Seite mit einem Klick. Zeige Uptime, laufende Vorfälle und geplante Wartungen transparent an.', v:false, delay:'d1'},
                {icon:<Network/>, title:'Multi-Node', text:'Überwache hunderte Nodes aus einem Dashboard. Leichtgewichtige Agents verbinden sich verschlüsselt mit deiner zentralen Instanz.', v:true, delay:'d2'},
              ].map(f => (
                <article key={f.title} className={`feat-card${f.v?' v':''} reveal${f.delay?' '+f.delay:''}`}>
                  <div className="feat-ico">{f.icon}</div>
                  <h3 className="h3">{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* SPLIT HIGHLIGHTS */}
        <section className="section-pad divider">
          <div className="container">
            <div className="split">
              <div className="split-text reveal">
                <span className="eyebrow">Alerting</span>
                <h2 className="h2">Erfahre von Problemen, bevor deine Nutzer es tun</h2>
                <p className="lead">Definiere präzise Regeln und lass Helio den Rest erledigen. Alarme landen dort, wo dein Team ohnehin schon ist.</p>
                <ul className="split-list">
                  <li><span className="ci"><Check size={14}/></span><div><b>Flexible Kanäle</b><span>Webhook, E-Mail, Slack, Discord, Telegram oder PagerDuty.</span></div></li>
                  <li><span className="ci"><Check size={14}/></span><div><b>Smarte Schwellwerte</b><span>Eskalationsstufen, Ruhezeiten und automatisches Auto-Resolve.</span></div></li>
                  <li><span className="ci"><Check size={14}/></span><div><b>Kein Alarm-Spam</b><span>Gruppierung &amp; Deduplizierung verhindern Benachrichtigungs-Fluten.</span></div></li>
                </ul>
              </div>
              <div className="split-visual reveal d2">
                <div className="panel">
                  <div className="panel-head">
                    <span className="pt"><BellRing size={16}/>Alert-Verlauf</span>
                    <span className="badge"><span className="dot dot-ok"/>3 aktiv</span>
                  </div>
                  <div className="panel-body">
                    <div className="alert-item down"><span className="ai-ico"><AlertOctagon size={16}/></span><div className="ai-main"><div className="ai-t">cache-02 antwortet nicht</div><div className="ai-d">HTTP 503 · 3 Versuche fehlgeschlagen</div></div><span className="ai-time">vor 2 min</span></div>
                    <div className="alert-item warn"><span className="ai-ico"><AlertTriangle size={16}/></span><div className="ai-main"><div className="ai-t">web-01 CPU &gt; 85 %</div><div className="ai-d">Schwellwert seit 4 min überschritten</div></div><span className="ai-time">vor 6 min</span></div>
                    <div className="alert-item ok"><span className="ai-ico"><Check size={16}/></span><div className="ai-main"><div className="ai-t">db-primary wiederhergestellt</div><div className="ai-d">Latenz wieder im Normalbereich</div></div><span className="ai-time">vor 18 min</span></div>
                    <div className="chip-row">
                      <span className="chip"><Cpu size={13}/>Webhook</span>
                      <span className="chip"><Mail size={13}/>E-Mail</span>
                      <span className="chip"><MessageSquare size={13}/>Slack</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="split rev">
              <div className="split-text reveal">
                <span className="eyebrow">Container</span>
                <h2 className="h2">Docker-Monitoring ohne Setup-Schmerzen</h2>
                <p className="lead">Helio findet deine Container von selbst und beginnt sofort mit dem Sammeln von Metriken. Ein Befehl, fertig.</p>
                <ul className="split-list">
                  <li><span className="ci"><Check size={14}/></span><div><b>Auto-Discovery</b><span>Neue Container erscheinen automatisch im Dashboard.</span></div></li>
                  <li><span className="ci"><Check size={14}/></span><div><b>Pro-Container-Metriken</b><span>CPU, RAM, Netzwerk-I/O und Restart-Counts je Service.</span></div></li>
                  <li><span className="ci"><Check size={14}/></span><div><b>Health-Checks &amp; Logs</b><span>Live-Logs und Status direkt aus dem Dashboard.</span></div></li>
                </ul>
              </div>
              <div className="split-visual reveal d2">
                <div className="panel">
                  <div className="panel-head">
                    <span className="pt"><Terminal size={16}/>Schnellstart</span>
                    <span className="badge mono">docker</span>
                  </div>
                  <div className="panel-body">
                    <div className="term">
                      <div className="term-line"><span className="pr">$</span><span className="cm">docker run -d --name helio \</span></div>
                      <div className="term-line out">-v /var/run/docker.sock:/var/run/docker.sock \</div>
                      <div className="term-line out">-p 9300:9300 helio/helio:latest</div>
                      <div className="term-line out"><span className="g">✓</span> Helio läuft auf :9300</div>
                      <div className="term-line out"><span className="g">✓</span> 14 Container automatisch erkannt</div>
                      <div className="term-line out"><span className="g">✓</span> Sammle Metriken …</div>
                    </div>
                    <div className="chip-row">
                      <span className="chip"><span className="dot dot-ok"/>14 Container</span>
                      <span className="chip"><Cpu size={13}/>Auto-Discovery</span>
                      <span className="chip"><Activity size={13}/>Live-Logs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE DEMO */}
        <section className="live section-pad" id="demo">
          <div className="container">
            <div className="section-head center">
              <span className="eyebrow reveal">Live</span>
              <h2 className="h2 reveal d1">Über tausende Instanzen im Einsatz</h2>
              <p className="lead reveal d2">Eine leichtgewichtige Engine, die mitwächst — vom Single-Board-Computer bis zum Multi-Node-Cluster.</p>
            </div>
            <div className="live-grid">
              {[
                {icon:<Server/>, count:'48210', decimals:'0', unit:'', label:'überwachte Nodes', delay:''},
                {icon:<Zap/>, count:'2.4', decimals:'1', unit:' M', label:'Metriken pro Minute', delay:'d1'},
                {icon:<Gauge/>, count:'99.98', decimals:'2', unit:' %', label:'durchschn. Uptime', delay:'d2'},
                {icon:<HardDrive/>, count:'42', decimals:'0', unit:' MB', label:'RAM-Footprint', delay:'d3'},
              ].map(c => (
                <div key={c.label} className={`live-card reveal${c.delay?' '+c.delay:''}`}>
                  <div className="lc-ico">{c.icon}</div>
                  <div className="live-num">
                    <span data-count={c.count} data-decimals={c.decimals}>0</span>
                    {c.unit && <span className="u">{c.unit}</span>}
                  </div>
                  <div className="lc-lbl">{c.label}</div>
                </div>
              ))}
            </div>
            <div className="live-status reveal d3">
              <span className="dot"/>Alle Systeme betriebsbereit · Status live aktualisiert
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="section-pad divider" id="preise">
          <div className="container">
            <div className="section-head center">
              <span className="eyebrow reveal">Preise</span>
              <h2 className="h2 reveal d1">Fair &amp; transparent — für alle Größen</h2>
              <p className="lead reveal d2">Self-Hosted ist und bleibt kostenlos. Bezahlte Pläne fügen Komfort und Team-Funktionen hinzu.</p>
            </div>
            <div className="price-grid">
              <article className="price-card reveal">
                <div className="price-name">Self-Hosted</div>
                <p className="price-desc">Für Homelabs und Einzelprojekte. Open Source, für immer kostenlos.</p>
                <div className="price-amt"><span className="num">€0</span><span className="per">/ für immer</span></div>
                <Link to="/dashboard" className="btn btn-secondary">Loslegen</Link>
                <ul className="price-feats">
                  {['Unbegrenzte Nodes & Container','Echtzeit-Metriken & Charts','Webhook- & E-Mail-Alerts','1 Status-Page','Community-Support'].map(f=>(
                    <li key={f}><span className="ck"><Check size={18}/></span>{f}</li>
                  ))}
                </ul>
              </article>
              <article className="price-card feat reveal d1">
                <span className="price-pop">Beliebt</span>
                <div className="price-name">Pro</div>
                <p className="price-desc">Für ernsthafte Self-Hoster, die mehr Komfort und Integrationen wollen.</p>
                <div className="price-amt"><span className="num">€12</span><span className="per">/ Monat</span></div>
                <Link to="/dashboard" className="btn btn-primary">14 Tage testen</Link>
                <ul className="price-feats">
                  {['Alles aus Self-Hosted','Slack, Discord & PagerDuty','1 Jahr Metrik-Historie','Unbegrenzte Status-Pages','Priorisierter Support'].map(f=>(
                    <li key={f}><span className="ck"><Check size={18}/></span>{f}</li>
                  ))}
                </ul>
              </article>
              <article className="price-card reveal d2">
                <div className="price-name">Team</div>
                <p className="price-desc">Für Teams mit Rollen, Audit-Logs und SSO-Anforderungen.</p>
                <div className="price-amt"><span className="num">€39</span><span className="per">/ Monat</span></div>
                <Link to="/dashboard" className="btn btn-secondary">Vertrieb kontaktieren</Link>
                <ul className="price-feats">
                  {['Alles aus Pro','Rollen & Berechtigungen','SSO (SAML / OIDC)','Audit-Logs','SLA & dedizierter Support'].map(f=>(
                    <li key={f}><span className="ck"><Check size={18}/></span>{f}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-pad divider" id="docs">
          <div className="container">
            <div className="section-head center">
              <span className="eyebrow reveal">FAQ</span>
              <h2 className="h2 reveal d1">Häufige Fragen</h2>
            </div>
            <div className="faq reveal d1">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}>
                  <button className="faq-q" aria-expanded={openFaq === i} onClick={() => toggleFaq(i)}>
                    {item.q}<span className="pm" aria-hidden="true" />
                  </button>
                  <div
                    className="faq-a"
                    ref={el => { faqRefs.current[i] = el; }}
                    style={{ height: openFaq === i ? undefined : '0px' }}
                  >
                    <div className="faq-a-inner">{item.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="section-pad cta" id="start">
          <div className="container">
            <div className="cta-box reveal">
              <span className="eyebrow" style={{justifyContent:'center'}}>Loslegen</span>
              <h2 className="h2" style={{marginTop:'14px'}}>In 60 Sekunden live</h2>
              <p className="lead">Ein Befehl genügt. Kein Account, keine Kreditkarte, keine Cloud. Starte Helio jetzt auf deinem eigenen Server.</p>
              <div className="cta-actions">
                <Link to="/dashboard" className="btn btn-primary btn-lg">Kostenlos hosten</Link>
                <a href="#docs" className="btn btn-secondary btn-lg"><BookOpen size={18}/>Zur Dokumentation</a>
              </div>
              <div className="code-snip">
                <code><span className="pr">$</span> curl -fsSL helio.sh/install | sh</code>
                <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy} aria-label="Befehl kopieren">
                  {copied ? <Check size={17}/> : <Copy size={17}/>}
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="footer" id="github">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="#top" className="brand"><span className="brand-mark" aria-hidden="true"/>Helio</a>
              <p>Open-Source-Monitoring für Server und Container, das du selbst hostest. Privacy-first, schlank und schnell.</p>
              <div className="footer-social">
                <a href="#github" aria-label="GitHub"><GH_ICON /></a>
                <a href="#" aria-label="Discord"><MessageCircle size={17}/></a>
                <a href="#" aria-label="X"><X_ICON /></a>
                <a href="#" aria-label="RSS"><Rss size={17}/></a>
              </div>
            </div>
            <div className="footer-col"><h5>Produkt</h5><ul>
              <li><a href="#features">Features</a></li><li><a href="#preise">Preise</a></li>
              <li><a href="#demo">Live-Demo</a></li><li><a href="#">Changelog</a></li>
            </ul></div>
            <div className="footer-col"><h5>Ressourcen</h5><ul>
              <li><a href="#docs">Dokumentation</a></li><li><a href="#">Installation</a></li>
              <li><a href="#">API-Referenz</a></li><li><a href="#">Status-Page-Guide</a></li>
            </ul></div>
            <div className="footer-col"><h5>Community</h5><ul>
              <li><a href="#github">GitHub</a></li><li><a href="#">Discord</a></li>
              <li><a href="#">Roadmap</a></li><li><a href="#">Beitragen</a></li>
            </ul></div>
            <div className="footer-col"><h5>Rechtliches</h5><ul>
              <li><a href="#">Impressum</a></li><li><a href="#">Datenschutz</a></li>
              <li><a href="#">Lizenz (Apache 2.0)</a></li><li><a href="#">Sicherheit</a></li>
            </ul></div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Helio. Open Source unter Apache 2.0.</p>
            <span className="fb-status"><span className="dot dot-ok"/>Alle Systeme betriebsbereit</span>
          </div>
        </div>
      </footer>
    </>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd helio-app/frontend && npx tsc --noEmit
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/landing.css frontend/src/pages/LandingPage.tsx
git commit -m "feat: add landing page component and CSS"
```

---

## Task 3: Wire Up Route

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update App.tsx**

```tsx
// helio-app/frontend/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.tsx';
import { ToastContainer } from './components/Toast.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Nodes } from './pages/Nodes.tsx';
import { Containers } from './pages/Containers.tsx';
import { Alerts } from './pages/Alerts.tsx';
import { StatusPage } from './pages/StatusPage.tsx';
import { Settings } from './pages/Settings.tsx';
import { LandingPage } from './pages/LandingPage.tsx';

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="nodes" element={<Nodes />} />
          <Route path="containers" element={<Containers />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/status" element={<StatusPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd helio-app/frontend && npx tsc --noEmit
```
Expected: no output

- [ ] **Step 3: Smoke test**

```bash
cd helio-app/frontend && npm run dev
```

Open `http://localhost:5173` — landing page should load with all 10 sections, scroll animations, working dark/light toggle, and FAQ accordion. `http://localhost:5173/dashboard` should still work as before.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: route / to landing page"
```
