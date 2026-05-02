// Playwright UI validation — exercises every new feature.
//
// Run: node scripts/validate-ui.mjs
// (Requires vite dev server running on :5173.)

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
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const shot = (name) =>
    page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });

  // Fresh state so we see the empty state + first-run flow.
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(400);
  await shot("01-empty-state");
  console.log("✓ 01 empty state");

  // Click a quick-add chip.
  await page.getByRole("button", { name: /AAPL/ }).first().click();
  await page.waitForTimeout(1400);
  await shot("02-one-card-after-quickadd");
  console.log("✓ 02 card after quick-add");

  // Open the Add dialog and add two more via keyboard, keeping dialog open.
  await page.keyboard.press("a");
  await page.waitForTimeout(350);
  await shot("03-add-dialog-open");

  // Type MSFT, add.
  await page.getByPlaceholder(/search symbol/i).fill("MSFT");
  await page.waitForTimeout(900);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
  // Dialog should still be open! Next type NVDA.
  await page.getByPlaceholder(/search symbol/i).fill("NVDA");
  await page.waitForTimeout(900);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
  await shot("04-dialog-still-open-after-multi-add");
  console.log("✓ 04 dialog remained open through multi-add");

  // Close dialog with Esc.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await shot("05-three-cards-grid");
  console.log("✓ 05 three-card grid");

  // Change sort to "A–Z".
  await page.getByRole("button", { name: /A–Z/i }).click();
  await page.waitForTimeout(600);
  await shot("06-sort-alpha");
  console.log("✓ 06 sort A–Z");

  // Change sort to "Change".
  await page.getByRole("button", { name: /^Change$/i }).click();
  await page.waitForTimeout(600);
  await shot("07-sort-change");
  console.log("✓ 07 sort by change");

  // Click a card to open the detail modal.
  // Target the first visible card by its symbol text.
  const firstCard = page.locator("main button.reveal").first();
  await firstCard.click();
  await page.waitForTimeout(1200);
  await shot("08-detail-modal");
  console.log("✓ 08 detail modal");

  // Close the detail modal.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // Remove a card by hovering + clicking X, then verify undo toast appears.
  await firstCard.hover();
  await page.waitForTimeout(250);
  const removeBtn = firstCard.locator('[aria-label^="Remove"]');
  await removeBtn.click();
  await page.waitForTimeout(500);
  await shot("09-undo-toast");
  console.log("✓ 09 undo toast visible");

  // Click the undo action.
  await page.getByRole("button", { name: /^Undo$/i }).click();
  await page.waitForTimeout(600);
  await shot("10-after-undo");
  console.log("✓ 10 after undo");

  await browser.close();
  console.log(`\nScreenshots → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
