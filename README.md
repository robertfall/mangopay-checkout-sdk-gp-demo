# Mangopay Checkout SDK - Error 205001 Race Condition

This repository reproduces a bug in the Mangopay Checkout SDK where error 205001 "Unknown error" is dispatched when Google Pay is configured as the **first** payment method.

## The Bug

When using `respectPaymentMethodsOrder: true` with Google Pay as the first payment method, the SDK attempts to render the Google Pay button **before** the Google Pay script (`pay.google.com/gp/p/js/pay.js`) finishes loading.

### Timeline
1. SDK iframe mounts
2. Google Pay accordion expands immediately (because it's first)
3. SDK tries to render Google Pay button
4. Google Pay script hasn't loaded yet → **Error 205001**
5. Script finishes loading → Button renders anyway

### Why Mangopay's Demo Doesn't Show This
In Mangopay's demo app, Card is the first payment method. By the time a user expands the Google Pay section, the script has already loaded. The race condition is hidden, not absent.

## Reproduction

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Run the test (uses headed browser for reliable reproduction)
npm test -- --headed
```

The test generates self-signed SSL certificates (required by Mangopay SDK) and starts an HTTPS server automatically.

### Manual Testing
```bash
npm run serve
# Open https://localhost:3456 in an incognito window
# Accept the self-signed certificate warning
```

## Expected Result

The test will detect error 205001 in the console/postMessage events, proving the race condition exists.

## Configuration

Uses the same configuration as Mangopay's official demo app:
- `clientId`: `sdk-unit-tests`
- `environment`: `SANDBOX`
- `respectPaymentMethodsOrder`: `true`
- Google Pay as **first** payment method

## Suggested Fix

The Mangopay SDK should await the Google Pay script load before attempting to render the button:

```javascript
// Current (buggy) - parallel execution
useEffect(() => { loadGooglePayScript(); }, []);
useEffect(() => { renderGooglePayButton(); }, []); // Fails if script not loaded

// Fixed - sequential execution
useEffect(() => {
  loadGooglePayScript().then(() => {
    renderGooglePayButton();
  });
}, []);
```

## Files

- `index.html` - Vanilla JS reproduction (no frameworks)
- `reproduction.spec.js` - Playwright test that captures the error
- `package.json` - Dependencies including `@mangopay/checkout-sdk@1.4.2`

## SDK Version

`@mangopay/checkout-sdk@1.4.2`
