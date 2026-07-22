/** Tailwind is layout utilities ONLY (DOMINIKOS-PLAN §3, §5.1) — every visual value
 *  (color/gradient/radius/font) comes from src/styles/tokens.css. Preflight is disabled
 *  so Tailwind's reset never fights XP.css control styling inside .win-body.
 *  (v3 on this machine — Node 16 can't run Tailwind v4's toolchain; utilities identical.) */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
