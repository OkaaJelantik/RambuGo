/**
 * Cek sisa: refresh #/home sesudah jalur sortir. `progress.ts` hanya
 * menyimpan jawaban kuis/studi, jadi `scoreOf('sortir')` selalu 0 — skrip ini
 * membuktikan angka apa yang tampil sesudah reload.
 */
import { chromium } from '/home/lann/node_modules/playwright/index.mjs'

const BASE = 'http://127.0.0.1:5173'
const browser = await chromium.launch()
// Tab baru = sessionStorage bersih, tidak mewarisi jawaban kuis dari cek lain.
const page = await browser.newPage({ viewport: { width: 360, height: 640 } })
const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(String(error)))
const out = { checks: {}, pageErrors }

await page.goto(`${BASE}/#/sortir`, { waitUntil: 'load' })
const cards = 12
for (let i = 0; i < cards; i += 1) {
  const card = page.locator('.sr-pajang').first()
  await card.waitFor()
  const signId = await card.getAttribute('data-sign')
  const label = await page.evaluate(async (id) => {
    const data = await import('/src/data.ts')
    const sign = data.SIGNS.find((candidate) => candidate.id === id)
    return data.KINDS[sign.kind].label
  }, signId)
  await card.click()
  await page.getByRole('button', { name: `Kotak ${label}`, exact: true }).click()
}
await page.getByRole('button', { name: 'Sudah Selesai' }).click()
await page.getByRole('button', { name: 'Selesai' }).click()
await page.getByRole('heading', { name: 'Kamu sampai di rumah!' }).waitFor()
await page.locator('.dlg').waitFor({ state: 'detached' })
const scoreText = async () => (await page.locator('.score-line').textContent())?.trim()
out.checks.sortirHomeHash = new URL(page.url()).hash
out.checks.sortirHomeBeforeReload = await scoreText()

await page.reload({ waitUntil: 'load' })
await page.getByRole('heading', { name: 'Kamu sampai di rumah!' }).waitFor()
out.checks.sortirHomeAfterReload = await scoreText()
out.checks.pageErrorCount = pageErrors.length
await page.screenshot({ path: new URL('./fase2-360x640-sortir-home-reload.png', import.meta.url).pathname })

console.log(`@@RESULT@@${JSON.stringify(out)}`)
await browser.close()
