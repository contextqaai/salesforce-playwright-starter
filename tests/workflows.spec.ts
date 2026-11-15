import { test, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { selected } from './scenarios.mjs';
for (const scenario of selected) {
  test(scenario.id, async ({ page }) => {
    const driver = {
      async start(role: string) {
        await page.goto('/');
        await page.locator('#role').selectOption(role);
        await page.locator('#start').click();
        await expect(page.getByRole('status')).toHaveText('Demo session ready');
      },
      async fill(id: string, value: string) { await page.locator(`#${id}`).fill(value); },
      async click(id: string, expected: string) {
        const response = page.waitForResponse(r => r.url().endsWith(`/api/${id}`) && r.request().method() === 'POST');
        await page.locator(`#${id}`).click();
        const r = await response;
        const data = await r.json();
        // Assert the response first so a deliberate defect is an assertion failure, not a wait timeout.
        assert.equal(data.message || data.error, expected);
        await expect(page.getByRole('status')).toHaveText(expected);
      },
      async state() {
        const response = await page.request.get('/api/state');
        assert.equal(response.status(), 200);
        return response.json();
      }
    };
    try { await scenario.run(driver); }
    finally {
      const cleanup = await page.request.delete('/api/session');
      assert.equal(cleanup.status(), 200);
      assert.equal((await page.request.get('/api/state')).status(), 401);
    }
  });
}
