// Playwright UI validation — exercises the new tag/select flows.
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

  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(400);

  // 01 — empty state, TagFilter should show ability to create tags even with no favorites
  await shot("01-empty-state");
  console.log("✓ 01 empty state");

  // Quick-add AAPL from empty-state chip; then use search dialog for MSFT, NVDA.
  await page.getByRole("button", { name: /AAPL/ }).first().click();
  await page.waitForTimeout(1200);
  for (const sym of ["MSFT", "NVDA"]) {
    await page.keyboard.press("a");
    await page.waitForTimeout(350);
    await page.getByPlaceholder(/search symbol/i).fill(sym);
    await page.waitForTimeout(900);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);
    // Skip the tag-on-add step to keep this first batch untagged.
    await page.getByRole("button", { name: /^skip$/i }).click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  await shot("02-three-cards");
  console.log("✓ 02 three cards");

  // F1: Create a standalone tag via TagFilter "+ new" button
  await page.getByRole("button", { name: /create a new tag/i }).click();
  await page.waitForTimeout(300);
  await page.keyboard.type("tech");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  await shot("03-standalone-tag-created");
  console.log("✓ 03 standalone tag created");

  // F4: Tag-on-add flow — add GOOGL, tag it "tech" immediately
  await page.keyboard.press("a");
  await page.waitForTimeout(400);
  await page.getByPlaceholder(/search symbol/i).fill("GOOGL");
  await page.waitForTimeout(900);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1200);
  await shot("04-tag-on-add-prompt");
  console.log("✓ 04 tag-on-add prompt visible");

  // Click the 'tech' chip in the tag-on-add step. Scope to inside the
  // open dialog so we don't hit the TagFilter chip behind the backdrop.
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^tech$/i }).click();
  await page.waitForTimeout(700);
  // Close dialog
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await shot("05-after-tag-on-add");
  console.log("✓ 05 after tag-on-add (GOOGL should have tech tag)");

  // F3: Enter selection mode
  await page.getByRole("button", { name: /^select$/i }).click();
  await page.waitForTimeout(400);
  await shot("06-selection-mode-entered");
  console.log("✓ 06 selection mode entered");

  // Click two cards to select
  const cards = page.locator("main button.reveal");
  await cards.nth(0).click();
  await page.waitForTimeout(200);
  await cards.nth(1).click();
  await page.waitForTimeout(400);
  await shot("07-two-selected-with-bulk-bar");
  console.log("✓ 07 two selected, bulk bar visible");

  // Bulk tag them "tech"
  await page.getByRole("button", { name: /^tag$/i }).first().click();
  await page.waitForTimeout(300);
  await shot("08-bulk-tag-popover");
  // Click 'tech' in the popover (first visible one)
  await page.locator('button', { hasText: /^tech$/i }).first().click();
  await page.waitForTimeout(800);
  await shot("09-after-bulk-tag");
  console.log("✓ 08-09 bulk tag applied");

  // F2: Delete the "tech" tag globally
  // Hover to reveal X, then click it
  const techFilterChip = page.locator('button', { hasText: /^tech$/i }).first();
  await techFilterChip.hover();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /delete tag tech/i }).click();
  await page.waitForTimeout(500);
  await shot("10-delete-tag-confirm");
  console.log("✓ 10 delete-tag confirm dialog");

  // Confirm
  await page.getByRole("button", { name: /^delete$/i }).click();
  await page.waitForTimeout(800);
  await shot("11-after-tag-delete");
  console.log("✓ 11 after tag delete");

  await browser.close();
  console.log(`\nScreenshots → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
