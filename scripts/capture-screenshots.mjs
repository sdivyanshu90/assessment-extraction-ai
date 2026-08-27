import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:3108";
const output = path.join(process.cwd(), "docs", "screenshots");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
const page = await desktop.newPage();

await open(page, "/");
await shot(page, "01-upload.png");

await page.locator("#question-paper").setInputFiles(path.join(process.cwd(), "benchmarks", "fixtures", "question-paper.png"));
await page.locator("#answer-sheet").setInputFiles([
  path.join(process.cwd(), "benchmarks", "fixtures", "answer-page-1.png"),
  path.join(process.cwd(), "benchmarks", "fixtures", "answer-page-2.png"),
]);
await page.getByRole("button", { name: /process assessment/i }).waitFor();
await shot(page, "02-upload-ready.png");

await open(page, "/?preview=processing");
await page.getByText("Mapping answers", { exact: true }).waitFor();
await shot(page, "03-processing.png");

await open(page, "/?preview=results");
await page.getByText("Question & answer mapping", { exact: true }).waitFor();
await page.locator(".active-highlight").first().waitFor();
await shot(page, "04-results.png");
await desktop.close();

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mobilePage = await mobile.newPage();
await open(mobilePage, "/");
await shot(mobilePage, "05-upload-mobile.png", true);
await open(mobilePage, "/?preview=results");
await mobilePage.getByText("Question & answer mapping", { exact: true }).waitFor();
await shot(mobilePage, "06-results-mobile.png", true);
await mobilePage.locator(".results-grid").evaluate((element) => { element.scrollTop = element.scrollHeight; });
await mobilePage.waitForTimeout(300);
await shot(mobilePage, "07-results-mobile-viewer.png");
await mobile.close();
await browser.close();

console.log(`Captured 7 application screenshots in ${output}`);

async function open(target, route) {
  await target.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await target.locator("body").waitFor();
  await target.evaluate(() => document.fonts.ready);
  await target.waitForTimeout(500);
}

async function shot(target, name, fullPage = false) {
  await target.screenshot({ path: path.join(output, name), fullPage, animations: "disabled" });
}
