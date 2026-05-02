// Playwright UI validation — throwaway script, not part of the app.
// Navigates through the primary user flows and screenshots each state
// so we can visually review the new typography and spacing.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../.ui-validation");

const BASE = "http://localhost:5173/";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // retina screenshots for clearer font inspection
  });
  const page = await ctx.newPage();

  const shot = (name) =>
    page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });

  // Fresh slate so the first-run empty state is visible.
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  // Give Fontshare + Google Fonts a moment.
  await page.waitForFunction(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(400);
  await shot("01-empty-state");
  console.log("✓ 01 empty state");

  // Open the Add dialog.
  await page.getByRole("button", { name: /add your first stock/i }).click();
  await page.waitForTimeout(300);
  await shot("02-add-dialog-empty");

  // Type a search.
  await page.getByPlaceholder(/search symbol/i).fill("apple");
  await page.waitForTimeout(900); // debounce + network
  await shot("03-add-dialog-results");
  console.log("✓ 02-03 add dialog");

  // Pick the first result by keyboard.
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  await shot("04-one-card");
  console.log("✓ 04 one card added");

  // Add two more via quick keyboard shortcut.
  for (const sym of ["MSFT", "NVDA"]) {
    await page.keyboard.press("a");
    await page.waitForTimeout(250);
    await page.getByPlaceholder(/search symbol/i).fill(sym);
    await page.waitForTimeout(900);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);
  }
  await shot("05-three-cards");
  console.log("✓ 05 three cards added");

  // Reload and confirm persistence + ticker tape.
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await shot("06-after-reload");
  console.log("✓ 06 after reload");

  // Hover a card to capture the remove-button reveal.
  const firstCard = page
    .locator("main")
    .locator("div")
    .filter({ hasText: /AAPL|MSFT|NVDA/ })
    .first();
  await firstCard.hover();
  await page.waitForTimeout(400);
  await shot("07-card-hover");
  console.log("✓ 07 card hover");

  // Open settings modal (edit API key).
  await page.getByLabel(/settings/i).click();
  await page.waitForTimeout(350);
  await shot("08-api-key-modal");
  console.log("✓ 08 api key modal");

  await browser.close();
  console.log(`\nScreenshots → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
