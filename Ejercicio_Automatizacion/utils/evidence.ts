import fs from 'node:fs';
import path from 'node:path';
import { Page } from '@playwright/test';

const RUN_STARTED_AT = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15).replace('T', '_');
let stepCounter = 0;

function sanitize(stepName: string): string {
  return stepName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function capture(page: Page, stepName: string): Promise<string> {
  stepCounter += 1;
  const fileName = `${String(stepCounter).padStart(3, '0')}_${sanitize(stepName)}.png`;
  const dir = path.join('evidencias', 'playwright-ts', RUN_STARTED_AT);
  const outputDir = path.resolve(process.cwd(), dir);
  const filePath = path.join(outputDir, fileName);

  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: filePath, fullPage: true });

  return filePath;
}
