// Lists translation keys used in src/ that are missing from en.json or ar.json.
import fs from 'node:fs'
import path from 'node:path'

const files = []
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.jsx?$/.test(e.name)) files.push(p)
  })
walk('src')
const used = new Set()
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  for (const m of src.matchAll(/(?:\bt\(|showToast\(|key: )\s*['"]([a-z_]+\.[a-z0-9_]+)['"]/g)) used.add(m[1])
}
const flat = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flat(v, `${pre}${k}.`) : [`${pre}${k}`]))
const strip = (k) => k.replace(/_(one|other|zero|two|few|many)$/, '')
for (const lang of ['en', 'ar']) {
  const raw = flat(JSON.parse(fs.readFileSync(`src/i18n/${lang}.json`, 'utf8')))
  const keys = new Set([...raw, ...raw.map(strip)])
  const missing = [...used].filter((k) => !keys.has(k)).sort()
  console.log(`${lang}: ${missing.length} missing${missing.length ? '\n  ' + missing.join('\n  ') : ''}`)
}
if (process.argv.includes('--diff')) {
  const en = new Set(flat(JSON.parse(fs.readFileSync('src/i18n/en.json', 'utf8'))).map(strip))
  const ar = new Set(flat(JSON.parse(fs.readFileSync('src/i18n/ar.json', 'utf8'))).map(strip))
  console.log(
    'in en not ar:',
    [...en].filter((k) => !ar.has(k)),
  )
  console.log(
    'in ar not en:',
    [...ar].filter((k) => !en.has(k)),
  )
}
