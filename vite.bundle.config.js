import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Build variant for `npm run bundle`.
 *
 * Output is a classic script (iife), not an ES module: browsers restrict
 * `type="module"` on file:// origins, and the whole point of the single-file
 * bundle is that someone can double-click it without a server.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    // Transpile down for the handoff build. This file gets emailed to people
    // whose machines we know nothing about, and untranspiled ES2021 (`??`,
    // `||=`) fails on a pre-2020 browser as a SyntaxError — meaning a blank
    // page with no explanation. es2017 covers Chrome 58+, Safari 11+, Edge 15+.
    target: 'es2017',
    modulePreload: false,
    // Emit the CSS as its own file so it can be inlined into <head>. Left to
    // itself this build injects styles from JavaScript, which means the page
    // renders unstyled until the bundle has parsed.
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})
