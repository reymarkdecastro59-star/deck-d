import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CURATED = [
  { slug: 'elden-ring', title: 'Elden Ring' },
  { slug: 'cyberpunk-2077', title: 'Cyberpunk 2077' },
  { slug: 'baldurs-gate-3', title: "Baldur's Gate 3" },
  { slug: 'hades', title: 'Hades' },
  { slug: 'stardew-valley', title: 'Stardew Valley' },
  { slug: 'hollow-knight', title: 'Hollow Knight' },
  { slug: 'portal-2', title: 'Portal 2' },
  { slug: 'celeste', title: 'Celeste' },
  { slug: 'death-stranding', title: 'Death Stranding' },
]

const PALETTE = ['#4c7dff', '#22d3ee', '#f59e0b', '#a855f7', '#ec4899', '#10b981']
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const WEB_DIR = path.resolve(SCRIPT_DIR, '..')
const COVERS_DIR = path.join(WEB_DIR, 'src', 'assets', 'landing', 'covers')
const MANIFEST_PATH = path.join(COVERS_DIR, 'covers.json')
const force = process.argv.includes('--force')

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function readEnvKey() {
  if (process.env.RAWG_API_KEY?.trim()) return process.env.RAWG_API_KEY.trim()

  // Vite convention: .env.local overrides .env for local secrets.
  for (const filename of ['.env.local', '.env']) {
    const envPath = path.join(WEB_DIR, filename)
    if (!(await exists(envPath))) continue

    const env = await readFile(envPath, 'utf8')
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const separator = trimmed.indexOf('=')
      if (separator === -1) continue
      if (trimmed.slice(0, separator).trim() !== 'RAWG_API_KEY') continue
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
      if (value) return value
    }
  }
  return undefined
}

function hashSlug(slug) {
  return [...slug].reduce((hash, character) => ((hash * 31 + character.charCodeAt(0)) >>> 0), 0)
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function titleLines(title) {
  const words = title.split(' ')
  if (words.length === 1) return [title]
  const midpoint = Math.ceil(words.length / 2)
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')]
}

function placeholderSvg(game) {
  const hash = hashSlug(game.slug)
  const firstIndex = hash % PALETTE.length
  const first = PALETTE[firstIndex]
  const second = PALETTE[(firstIndex + ((hash >>> 3) % (PALETTE.length - 1)) + 1) % PALETTE.length]
  const lines = titleLines(game.title)
  const text = lines
    .map((line, index) => `<tspan x="300" dy="${index === 0 ? 0 : 58}">${escapeXml(line)}</tspan>`)
    .join('')
  const startY = lines.length === 1 ? 470 : 440

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900" role="img" aria-label="${escapeXml(game.title)} placeholder">
  <defs><radialGradient id="gradient" cx="28%" cy="18%" r="95%"><stop offset="0%" stop-color="${first}"/><stop offset="100%" stop-color="${second}"/></radialGradient></defs>
  <rect width="600" height="900" fill="url(#gradient)"/>
  <rect width="600" height="900" fill="#0b1020" opacity="0.18"/>
  <text x="300" y="${startY}" fill="#fff" font-family="Inter, sans-serif" font-size="48" font-weight="700" text-anchor="middle">${text}</text>
  <text x="570" y="870" fill="#fff" fill-opacity="0.4" font-family="Inter, sans-serif" font-size="14" text-anchor="end">PLACEHOLDER</text>
</svg>
`
}

async function readManifest() {
  if (!(await exists(MANIFEST_PATH))) return { covers: [] }
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
  } catch {
    console.warn('warning: existing covers.json is invalid; rebuilding manifest')
    return { covers: [] }
  }
}

async function writePlaceholder(game, metadata = {}) {
  const file = `${game.slug}.svg`
  await writeFile(path.join(COVERS_DIR, file), placeholderSvg(game), 'utf8')
  return { slug: game.slug, title: game.title, file, aspect: 0.6667, width: 600, height: 900, sourceUrl: metadata.sourceUrl ?? null, rawgId: metadata.rawgId ?? null }
}

async function main() {
  await mkdir(COVERS_DIR, { recursive: true })
  const apiKey = await readEnvKey()
  const placeholderMode = !apiKey
  const existing = await readManifest()
  const expectedExtension = placeholderMode ? 'svg' : 'webp'
  const existingBySlug = new Map(existing.covers?.map((cover) => [cover.slug, cover]))
  const covers = []

  if (placeholderMode) console.warn('RAWG_API_KEY is absent; generating SVG placeholders.')

  for (const game of CURATED) {
    const cached = existingBySlug.get(game.slug)
    const expectedFile = `${game.slug}.${expectedExtension}`
    if (!force && cached?.file === expectedFile && (await exists(path.join(COVERS_DIR, expectedFile)))) {
      console.log(`cached: ${game.slug}`)
      covers.push(cached)
      continue
    }

    if (placeholderMode) {
      console.log(`placeholder: ${game.slug}`)
      covers.push(await writePlaceholder(game))
      continue
    }

    const gameResponse = await fetch(`https://api.rawg.io/api/games/${game.slug}?key=${encodeURIComponent(apiKey)}`)
    if (!gameResponse.ok) throw new Error(`RAWG lookup failed for ${game.slug}: ${gameResponse.status} ${gameResponse.statusText}`)
    const rawgGame = await gameResponse.json()
    const sourceUrl = rawgGame.background_image || null

    if (!sourceUrl) {
      console.warn(`warning: RAWG returned no background_image for ${game.slug}; generating placeholder.`)
      covers.push(await writePlaceholder(game, { sourceUrl, rawgId: rawgGame.id ?? null }))
      await sleep(250)
      continue
    }

    const imageResponse = await fetch(sourceUrl)
    if (!imageResponse.ok) throw new Error(`Cover download failed for ${game.slug}: ${imageResponse.status} ${imageResponse.statusText}`)
    const { default: sharp } = await import('sharp')
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    const file = `${game.slug}.webp`
    await sharp(imageBuffer).resize(600, 900, { fit: 'cover', position: 'centre' }).webp({ quality: 82, effort: 4 }).toFile(path.join(COVERS_DIR, file))
    console.log(`fetched: ${game.slug}`)
    covers.push({ slug: game.slug, title: game.title, file, aspect: 0.6667, width: 600, height: 900, sourceUrl, rawgId: rawgGame.id ?? null })
    await sleep(250)
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify({ generatedAt: new Date().toISOString(), source: placeholderMode ? 'placeholder' : 'rawg', covers }, null, 2)}\n`, 'utf8')
  console.log(`wrote: ${MANIFEST_PATH}`)
}

await main()
