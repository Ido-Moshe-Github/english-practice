#!/usr/bin/env node
/**
 * Fold the built app into one self-contained HTML file.
 *
 *   npm run bundle   ->   play.html  (and dist/play.html)
 *
 * The app has no backend and no runtime network calls, so inlining the CSS and
 * JS makes it openable straight from the filesystem — hand someone the single
 * file and they double-click it. No Node, no npm, no terminal.
 *
 * vite.bundle.config.js builds a classic script rather than an ES module,
 * because browsers restrict `type="module"` on file:// origins. A classic
 * script is NOT deferred, so it has to go at the end of <body>: left in <head>
 * where Vite emits it, it runs before #root exists and React throws #299.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ROOT } from './claudeCli.js'

const DIST = resolve(ROOT, 'dist')
const OUT = resolve(DIST, 'play.html')

/**
 * A second copy at the top of the project folder. If the whole folder is handed
 * to someone, this is the one obvious thing to double-click — no build step, no
 * Node, no digging through src/.
 */
const HANDOFF = resolve(ROOT, 'play.html')

/**
 * `</script>` inside inlined JS would close the tag early. Escaping the slash
 * is invisible to the JS parser but stops the HTML parser from seeing a tag.
 */
function escapeForScriptTag(code) {
  return code.replace(/<\/(script)/gi, '<\\/$1')
}

async function main() {
  let html = await readFile(resolve(DIST, 'index.html'), 'utf8')
  const assets = await readdir(resolve(DIST, 'assets'))

  const styles = []
  const scripts = []

  for (const file of assets) {
    const contents = await readFile(resolve(DIST, 'assets', file), 'utf8')

    if (file.endsWith('.css')) {
      styles.push(contents)
      html = html.replace(new RegExp(`<link[^>]*href="[^"]*${file}"[^>]*>`), '')
    } else if (file.endsWith('.js')) {
      scripts.push(contents)
      html = html.replace(new RegExp(`<script[^>]*src="[^"]*${file}"[^>]*></script>`), '')
    }
  }

  if (!scripts.length) throw new Error('no JS bundle found in dist/assets')

  // These replacements MUST use functions, not strings: minified JS contains
  // `$&` and `$'` sequences that String.replace would expand into the output.
  html = html.replace('</head>', () => `<style>\n${styles.join('\n')}\n</style>\n</head>`)
  html = html.replace(
    '</body>',
    () => `<script>\n${escapeForScriptTag(scripts.join('\n'))}\n</script>\n</body>`
  )

  const leftover = html.match(/(?:src|href)="\/assets\/[^"]+"/g)
  if (leftover) throw new Error(`these assets were not inlined: ${leftover.join(', ')}`)
  if (!/<\/script>\s*<\/body>/.test(html)) {
    throw new Error('the inlined script did not land at the end of <body>')
  }

  await writeFile(OUT, html, 'utf8')
  await writeFile(HANDOFF, html, 'utf8')

  const kb = Math.round(Buffer.byteLength(html) / 1024)
  console.log(`wrote dist/play.html (${kb} KB, self-contained)`)
  console.log('wrote play.html at the top of the folder — the file to double-click')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
