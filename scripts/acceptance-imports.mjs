// Explicit live acceptance run; never part of the offline unit test suite.
// WAIT_URL=http://127.0.0.1:8087 pnpm test:imports:live
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.env.WAIT_URL || 'http://127.0.0.1:8087';
const output = process.env.WAIT_ACCEPTANCE_DIR || '/tmp/velhoksi-acceptance';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const result = [];
try {
  await page.goto(`${base}/?mode=wait`);
  for (const [name, artist, track, duration] of [
    ['Remember', 'Hank Mobley', '2BhU0Hl5OatWiCW93pE2b8', 342.3],
    ['Confirmation', 'Charlie Parker', '0rQubvtPfInTgElCq1fhBr', 177.7],
  ]) {
    await page.locator('#open-link').click();
    await page.locator('#link-url').fill(`https://open.spotify.com/track/${track}`);
    await page.locator('#resolve-link').click();
    await page.locator('.import-candidate').first().waitFor({ timeout: 120_000 });
    const match = await page.locator('.import-candidate').first().innerText();
    assert.ok(match.includes(artist), match);
    console.log(name, 'match:', match.replaceAll('\n', ' · '));
    await page.screenshot({ path: `${output}/${name.toLowerCase()}-matches.png` });
    await page.locator('.import-candidate button').first().click();
    await page.locator('#link-dialog').waitFor({ state: 'hidden', timeout: 600_000 });
    // Completion must never autoplay.
    const video = page.locator('#media');
    await page.waitForFunction(() => {
      const root = [...document.querySelectorAll('*')].map(e => e.shadowRoot).find(r => r?.querySelector('#media'));
      return root?.querySelector('#media')?.readyState >= 2;
    });
    const actual = await video.evaluate(m => ({ duration: m.duration, paused: m.paused }));
    assert.ok(actual.paused);
    assert.ok(Math.abs(actual.duration - duration) < 3, JSON.stringify(actual));
    await page.locator('#speed-number').fill('75');
    await page.locator('#speed-number').dispatchEvent('change');
    await page.locator('#add-range').click();
    await page.locator('#play').click();
    await page.waitForTimeout(1200);
    const playing = await video.evaluate(m => ({ paused: m.paused, time: m.currentTime, rate: m.playbackRate, pitch: m.preservesPitch }));
    assert.equal(playing.paused, false); assert.equal(playing.rate, .75); assert.ok(playing.pitch); assert.ok(playing.time > 0);
    await page.locator('#play').click();
    await page.waitForTimeout(600);
    result.push({ name, artist, match, ...actual, playback: playing });
    console.log(name, 'import/playback PASS', actual.duration);
  }
  await page.reload();
  await page.locator('#file-tabs [role=tab]').nth(1).waitFor();
  assert.equal(await page.locator('#file-tabs [role=tab]').count(), 2);
  assert.equal(await page.locator('#media').evaluate(m => m.paused), true);
  assert.equal(await page.locator('#speed-number').inputValue(), '75');
  assert.ok(await page.locator('#marks-list').innerText());
  await page.screenshot({ path: `${output}/restored.png` });
  await context.setOffline(true);
  await page.reload();
  await page.locator('#file-tabs [role=tab]').nth(1).waitFor();
  await page.locator('#play').click();
  await page.waitForTimeout(900);
  assert.equal(await page.locator('#media').evaluate(m => m.paused), false);
  await page.locator('#play').click();
  await context.setOffline(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#open-link').click();
  await page.screenshot({ path: `${output}/mobile.png` });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('PASS: two imports, pitch-preserving playback, loop ranges, reload, offline playback, mobile dialog.');
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
