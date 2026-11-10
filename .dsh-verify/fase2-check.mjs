/**
 * Verifikasi fase 2 di browser sungguhan (360×640), memakai dev server yang
 * sudah hidup di 5173. Bukan bagian build; hasil ditulis ke stdout + screenshot
 * di folder yang sama.
 */
import { chromium } from '/home/lann/node_modules/playwright/index.mjs'

const BASE = 'http://127.0.0.1:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 360, height: 640 } })

const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(String(error)))

const out = { base: BASE, viewport: '360x640', checks: {}, pageErrors, screenshots: [] }
const shot = async (name) => {
  const path = new URL(`./${name}.png`, import.meta.url).pathname
  await page.screenshot({ path })
  out.screenshots.push(path)
  return path
}
const hashOf = () => new URL(page.url()).hash

// ---------------------------------------------------------------- (a) ?s=
await page.goto(`${BASE}/?s=studi`, { waitUntil: 'load' })
out.checks.devStudi = (await page.locator('.quiz-progress span').first().textContent())?.trim()
await page.goto(`${BASE}/?s=studi&step=7`, { waitUntil: 'load' })
out.checks.devStudiStepIgnored = (
  await page.locator('.quiz-progress span').first().textContent()
)?.trim()
await page.goto(`${BASE}/?s=kuis`, { waitUntil: 'load' })
out.checks.devKuis = (await page.locator('.quiz-progress span').first().textContent())?.trim()
await page.goto(`${BASE}/?s=crossroad`, { waitUntil: 'load' })
out.checks.devCrossroad = (
  await page.getByRole('heading', { name: 'Kamu sampai di persimpangan' }).count()
) > 0
await page.goto(`${BASE}/?s=walk&step=2`, { waitUntil: 'load' })
out.checks.devWalkStep2Pips = await page.locator('.wk-pips i.on').count()
out.checks.devWalkStep2Line = (await page.locator('.dlg-live').textContent())?.trim()
await shot('fase2-360x640-dev-walk-step2')

// ------------------------------------------------------- (b) back browser
await page.goto(`${BASE}/`, { waitUntil: 'load' })
await page.getByRole('button', { name: /Keluar kelas/ }).click()
out.checks.hashAfterStart = hashOf()
for (let leg = 0; leg < 3; leg += 1) {
  const continueBtn = page.getByRole('button', { name: 'Lanjut jalan' })
  await continueBtn.waitFor({ timeout: 20000 })
  await continueBtn.click()
}
await page.getByRole('heading', { name: 'Kamu sampai di persimpangan' }).waitFor()
out.checks.hashAtCrossroad = hashOf()
out.checks.crossroadReached = true

await page.goBack()
await page.waitForTimeout(800)
out.checks.hashAfterBack = hashOf()
out.checks.afterBackHasWalkScene = (await page.locator('.wk-scene').count()) > 0
out.checks.afterBackPipsOn = await page.locator('.wk-pips i.on').count()
out.checks.afterBackHasClassroomCta =
  (await page.getByRole('button', { name: /Keluar kelas/ }).count()) > 0
out.checks.afterBackStillCrossroad =
  (await page.getByRole('heading', { name: 'Kamu sampai di persimpangan' }).count()) > 0
await shot('fase2-360x640-back-to-walk')

// --------------------------------------------------- (c) reload #/studi/7
await page.goto(`${BASE}/#/studi/7`, { waitUntil: 'load' })
out.checks.reloadStudiBefore = (
  await page.locator('.quiz-progress span').first().textContent()
)?.trim()
await page.reload({ waitUntil: 'load' })
await page.waitForTimeout(300)
out.checks.reloadStudiAfter = (
  await page.locator('.quiz-progress span').first().textContent()
)?.trim()
await shot('fase2-360x640-reload-studi7')

// (d) rumah: skor jalur terakhir tahan reload, tanpa panel, muat 1 layar
await page.goto(`${BASE}/#/kuis/0`, { waitUntil: 'load' })
const answers = await page.evaluate(async () => {
  const data = await import('/src/data.ts')
  return data.QUESTIONS.map((q) => ({ correct: q.options[q.answer], options: q.options }))
})
for (let i = 0; i < 3; i += 1) {
  await page.getByRole('button', { name: answers[i].correct, exact: true }).click()
  await page.getByRole('button', { name: 'Soal berikutnya →' }).click()
}
for (let i = 3; i < 5; i += 1) {
  const wrong = answers[i].options.find((option) => option !== answers[i].correct)
  await page.getByRole('button', { name: wrong, exact: true }).click()
  await page
    .getByRole('button', {
      name: i === 4 ? 'Sampai di rumah →' : 'Soal berikutnya →',
    })
    .click()
}
await page.getByRole('heading', { name: 'Kamu sampai di rumah!' }).waitFor()
await page.locator('.dlg').waitFor({ state: 'detached' })
const homeScore = async () => (await page.locator('.score-line').textContent())?.trim()
out.checks.homeHash = hashOf()
out.checks.homeScoreBeforeReload = await homeScore()
out.checks.homePanelCount = await page.locator('.dlg').count()
out.checks.homeLiveText = (await page.locator('.dlg-live').textContent())?.trim()
out.checks.homeScroll = await page.evaluate(() => {
  const el = document.scrollingElement ?? document.documentElement
  return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }
})
out.checks.homeFitsViewport =
  out.checks.homeScroll.scrollHeight === out.checks.homeScroll.clientHeight
await shot('fase2-360x640-home-no-panel')

// Refresh tepat di #/home: skor harus sama, bukan 0/5.
await page.reload({ waitUntil: 'load' })
await page.getByRole('heading', { name: 'Kamu sampai di rumah!' }).waitFor()
await page.locator('.dlg').waitFor({ state: 'detached' })
out.checks.homeHashAfterReload = hashOf()
out.checks.homeScoreAfterReload = await homeScore()
out.checks.homeReloadScoreSame =
  out.checks.homeScoreAfterReload === out.checks.homeScoreBeforeReload
await shot('fase2-360x640-home-reload')

// ------------------------------------------------------- (e) pageerror

out.checks.pageErrorCount = pageErrors.length

console.log(`@@RESULT@@${JSON.stringify(out)}`)
await browser.close()
