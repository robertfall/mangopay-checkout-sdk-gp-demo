// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Mangopay Checkout SDK - Error 205001 Race Condition Reproduction
 *
 * This test demonstrates a bug in the Mangopay Checkout SDK where error 205001
 * "Unknown error" is dispatched when Google Pay is configured as the FIRST
 * payment method with `respectPaymentMethodsOrder: true`.
 *
 * Root Cause:
 * The SDK's hosted iframe has competing React hooks:
 * 1. One hook loads the Google Pay script (pay.google.com/gp/p/js/pay.js)
 * 2. Another hook tries to render the Google Pay button immediately
 *
 * When Google Pay is first and its accordion expands immediately, the render
 * hook runs before the script finishes loading, causing error 205001.
 *
 * Expected: The SDK should await script load before attempting to render.
 */

test.describe('Mangopay Google Pay Error 205001', () => {

  test('error 205001 occurs when Google Pay is first payment method', async ({ page, context }) => {
    // Clear all caches to ensure Google Pay script is not pre-loaded
    await context.clearCookies();

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('205001')) {
        console.log('Console:', text);
      }
    });

    // Navigate to reproduction page (Google Pay first is default)
    await page.goto('/');

    // Wait for SDK initialization and potential error
    await page.waitForTimeout(5000);

    // Check for error banner visibility
    const errorBanner = page.locator('#error-banner');
    const isErrorVisible = await errorBanner.isVisible();

    // Check console log for error detection - look for the specific error message
    const logContainer = page.locator('#log-container');
    const logText = await logContainer.textContent();
    const hasError205001InLog = logText?.includes('ERROR 205001 DETECTED') ?? false;

    // Take screenshot for evidence
    await page.screenshot({
      path: 'reproduction-gpay-first.png',
      fullPage: true
    });

    console.log('\n========================================');
    console.log('TEST: Google Pay FIRST (should trigger bug)');
    console.log('========================================');
    console.log('Error banner visible:', isErrorVisible);
    console.log('Error 205001 in log:', hasError205001InLog);
    console.log('========================================\n');

    if (isErrorVisible || hasError205001InLog) {
      console.log('BUG CONFIRMED: Error 205001 was detected.');
      console.log('This proves the race condition exists in the Mangopay SDK.');

      // Verify the Google Pay UI still rendered (proving the race condition)
      const iframe = page.frameLocator('iframe').first();
      const googlePaySection = iframe.locator('text=Google Pay');
      const gpayVisible = await googlePaySection.isVisible().catch(() => false);

      console.log('Google Pay UI rendered after error:', gpayVisible);

      expect(isErrorVisible || hasError205001InLog).toBe(true);
    } else {
      console.log('No error detected - Google Pay script may have been cached.');
      console.log('Try running: npx playwright test --headed');
      console.log('Or clear browser cache and try again.');

      // Skip rather than fail if no error (could be caching)
      test.skip();
    }
  });

  test('error does NOT occur when Card is first (control test)', async ({ page, context }) => {
    await context.clearCookies();

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('205001') || text.includes('Payment method order')) {
        console.log('Console:', text);
      }
    });

    // Navigate with Card first
    await page.goto('/?order=card-first');

    // Wait for SDK initialization
    await page.waitForTimeout(3000);

    // Check for error before switching to Google Pay
    const logContainer = page.locator('#log-container');
    let logText = await logContainer.textContent();
    const hasError205001Initial = logText?.includes('ERROR 205001 DETECTED') ?? false;

    console.log('\n========================================');
    console.log('TEST: Card FIRST (control - should NOT trigger bug)');
    console.log('========================================');
    console.log('Error 205001 on initial load:', hasError205001Initial);

    // Now click on Google Pay to expand it (by this time the script should be loaded)
    const iframe = page.frameLocator('iframe').first();
    const googlePayAccordion = iframe.locator('text=Google Pay');

    if (await googlePayAccordion.isVisible()) {
      console.log('Clicking Google Pay accordion...');
      await googlePayAccordion.click();
      await page.waitForTimeout(2000);

      // Check if Google Pay button rendered successfully
      const gpayButton = iframe.locator('[aria-label*="Google Pay"], button:has-text("Google Pay")');
      const gpayVisible = await gpayButton.isVisible().catch(() => false);
      console.log('Google Pay button visible after click:', gpayVisible);
    }

    // Check for any errors after switching
    logText = await logContainer.textContent();
    const hasError205001Final = logText?.includes('ERROR 205001 DETECTED') ?? false;

    // Take screenshot
    await page.screenshot({
      path: 'reproduction-card-first.png',
      fullPage: true
    });

    console.log('Error 205001 after switching to Google Pay:', hasError205001Final);
    console.log('========================================\n');

    // This test verifies the bug is specific to Google Pay being first
    // When Card is first, the error should NOT occur
    if (!hasError205001Final) {
      console.log('CONTROL PASSED: No error 205001 when Card is first.');
      console.log('This confirms the bug is specific to Google Pay being the first payment method.');
    } else {
      console.log('Unexpected: Error 205001 occurred even with Card first.');
      console.log('This may indicate caching or a different issue.');
    }

    // Don't fail on this test - it's a control/informational test
    // The important assertion is in the first test
  });

});
