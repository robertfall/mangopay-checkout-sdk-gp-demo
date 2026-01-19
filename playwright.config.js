// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'https://localhost:3456',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'npx serve -l 3456 --ssl-cert cert.pem --ssl-key key.pem',
    url: 'https://localhost:3456',
    reuseExistingServer: false,
    ignoreHTTPSErrors: true,
  },
});
