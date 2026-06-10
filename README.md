# GTM Toolkit

Configurable event tracking and user signals for GA4/GTM. Drop-in JavaScript library that fires events from link clicks, CSS selector matches, form submissions, and cookie-based user context -- all via a fluent builder API.

**~9 KB minified. Zero dependencies. ES5-compatible.**

## Quick Start

Load the minified bundle from jsDelivr and configure with the fluent API:

```html
<script src="https://cdn.jsdelivr.net/gh/thecleanbedroom/gtm-toolkit@main/dist/gtm-toolkit.min.js"></script>
<script>
  GTMToolkit.onLinkClick("tel:", "click_phone")
    .onlyMobile()
    .onLinkClick("mailto:", "click_email")
    .onLinkClick(/(goo\.gl\/maps|maps\.google\.com)/i, "click_directions")
    .newTab()
    .onLinkClick(["google.com/maps", "maps.google.com"], "click_directions")
    .newTab()
    .onSelectorClick(".chat-open-link", "click_chat")
    .onFormSubmit(".frm-fluent-form", ".ff-message-success", "form_submit")
    .start();
</script>
```

Place this in a **GTM Custom HTML tag** triggered on **DOM Ready** (`gtm.dom`), or before `</body>` in your site's HTML.

> The toolkit requires `document.body` to exist (for click listeners and MutationObserver), so the Page View trigger (`gtm.js`) is too early.

## How It Works

On `.start()`, the toolkit activates three modules in order:

1. **Listeners** register event handlers but fire nothing until the user interacts:
   - **Link rules** delegate a single click handler on `document`, match `<a>` hrefs against your patterns, and push the event on first match.
   - **Selector rules** use `Element.closest()` to walk up from clicked child elements to find a matching ancestor.
   - **Form rules** start a `MutationObserver` on `document.body`, watching for a success element to appear inside the form container. Works with Fluent Forms, WPForms, Gravity Forms, and any AJAX form that injects a success element.

2. **Signals** run all cookie-based context checks immediately:
   - **hasJs** -- Sets a `ga_user_has_js` cookie. Visitors without JavaScript (bots, crawlers) never get this cookie.
   - **pageCount** -- Increments a `ga_user_page_views` cookie on every page load.
   - **include** -- Pushes a `ga_user_include` event for returning visitors (page views > 1).
   - **gclid** -- Detects `?gclid=` in the URL (Google Ads click ID), persists it in a cookie, and pushes a `hasGclid` event on return visits.

3. **Test Panel** renders a floating bar with clickable test elements for every registered rule, but only when [Tag Assistant](https://tagassistant.google.com/) is active.

## Complete Configuration

```html
<script src="https://cdn.jsdelivr.net/gh/thecleanbedroom/gtm-toolkit@main/dist/gtm-toolkit.min.js"></script>
<script>
  GTMToolkit

    // -- Global settings -------------------------------------------
    .toGTMDefault() // Default transport: dataLayer.push (default)
    // .toGADefault()         // Or: default transport: gtag('event', ...)
    .cookieExpiry(30) // Cookie lifetime in days (default: 30)
    .debug(true) // Force debug logging on (default: auto-detect)

    // -- Link click rules ------------------------------------------
    // Match <a> href against string, array of strings, or RegExp

    // Track phone taps, mobile only
    .onLinkClick("tel:", "click_phone")
    .onlyMobile()

    // Track email clicks
    .onLinkClick("mailto:", "click_email")

    // Track Google Maps links, force new tab
    .onLinkClick(
      ["goo.gl/maps", "maps.google.com", "maps.app.goo.gl"],
      "click_directions",
    )
    .newTab()

    // Track with RegExp
    .onLinkClick(/example\.com\/pricing/i, "click_pricing")

    // Override transport for a specific rule
    .onLinkClick("tel:", "click_phone_ga")
    .toGA()

    // -- Selector click rules --------------------------------------
    // Match any click by CSS selector (uses Element.closest)

    .onSelectorClick(".chat-open-link", "click_chat")
    .onSelectorClick(".mobile-cta", "click_cta")
    .onlyMobile()

    // -- Form submission rules -------------------------------------
    // Detect AJAX form submissions via MutationObserver

    .onFormSubmit(".frm-fluent-form", ".ff-message-success", "form_submit")
    .onFormSubmit(
      "#gform_1",
      ".gform_confirmation_message",
      "gravity_form_submit",
    )

    // -- Start -----------------------------------------------------
    .start();
</script>
```

## API Reference

### Global Settings

Every method returns `GTMToolkit` for chaining.

| Method                | Description                                   | Default     |
| --------------------- | --------------------------------------------- | ----------- |
| `.toGTMDefault()`     | Set default transport to `dataLayer.push`     | `dataLayer` |
| `.toGADefault()`      | Set default transport to `gtag('event', ...)` | --          |
| `.cookieExpiry(days)` | Set cookie lifetime in days for signals       | `30`        |
| `.debug(bool)`        | Force debug mode on or off                    | Auto-detect |
| `.start()`            | Initialize the toolkit. Idempotent.           | --          |

### Rule Registration

| Method                                                | Arguments                                                             | Description                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| `.onLinkClick(match, event)`                          | `match`: `string`, `string[]`, or `RegExp`; `event`: event name       | Push event when a clicked `<a>` href matches        |
| `.onSelectorClick(selector, event)`                   | `selector`: CSS selector; `event`: event name                         | Push event when a clicked element matches           |
| `.onFormSubmit(formSelector, successSelector, event)` | `formSelector`, `successSelector`: CSS selectors; `event`: event name | Push event when success element appears inside form |

### Per-Rule Modifiers

Call these immediately after a rule registration method. They apply to the most recently registered rule.

| Method          | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| `.onlyMobile()` | Only fire on mobile devices (not tablets, not desktop)       |
| `.newTab()`     | Force matched links to open in a new tab (`target="_blank"`) |
| `.toGA()`       | Override this rule's transport to `gtag`                     |
| `.toGTM()`      | Override this rule's transport to `dataLayer`                |

### Link Matching

`.onLinkClick()` supports three match types:

| Type       | Example                              | Behavior                               |
| ---------- | ------------------------------------ | -------------------------------------- |
| **String** | `'tel:'`                             | `href.indexOf(match) !== -1`           |
| **Array**  | `['goo.gl/maps', 'maps.google.com']` | True if any string matches via indexOf |
| **RegExp** | `/example\.com\/pricing/i`           | `match.test(href)`                     |

## Debug Mode

Debug mode enables verbose console logging for all modules.

**Auto-detection** (when `.debug()` is not called): debug mode activates automatically if any of these are true:

- Google Tag Assistant is running (`window.__TAG_ASSISTANT_API` exists)
- URL contains `?gtm_debug` parameter
- A `gtm_debug` cookie is set

**Explicit override**: Call `.debug(true)` or `.debug(false)` to force debug mode regardless of auto-detection.

**Test Panel**: When debug mode is active _and_ Tag Assistant is running, a floating bar appears at the bottom of the page with clickable test elements for every registered rule:

- Link rules get a sample `<a>` element with the correct href
- Selector rules get a `<button>` with the matching class
- Form rules get a "simulate" button that injects a success element

## Signals

Signals run automatically on `.start()` and push cookie-based user context into the dataLayer. All cookies use `Secure` and `SameSite=Lax` attributes.

### Cookies Set

| Cookie               | Value              | Lifetime                       | Purpose                                       |
| -------------------- | ------------------ | ------------------------------ | --------------------------------------------- |
| `ga_user_has_js`     | `1`                | 365 days                       | Proves JavaScript ran (filters bots/crawlers) |
| `ga_user_page_views` | Incrementing count | Configurable (default 30 days) | Session depth tracking                        |
| `ga_user_include`    | `1`                | 1 day                          | Marks returning visitors                      |
| `ga_user_from_ad`    | `0` or `1`         | Configurable (default 30 days) | Persists Google Ads click attribution         |

### Events Pushed

| Event             | Condition                                                     | Parameters     |
| ----------------- | ------------------------------------------------------------- | -------------- |
| `ga_user_include` | Page views > 1 (returning visitor)                            | `{ value: 1 }` |
| `hasGclid`        | `ga_user_from_ad` cookie is `1` (return visit after ad click) | `{ value: 1 }` |

## Device Detection

The `.onlyMobile()` modifier uses a two-tier detection strategy:

1. **UAParser** -- If [UAParser.js](https://github.com/nicedayfor/ua-parser-js) is loaded on the page, its device type is used automatically
2. **Built-in regex** -- Lightweight regex against `navigator.userAgent` for mobile and tablet detection

Mobile means phone only. Tablets and desktops are excluded.

## Transport

The toolkit supports two transport mechanisms:

| Transport             | Push method                                         | When to use            |
| --------------------- | --------------------------------------------------- | ---------------------- |
| `dataLayer` (default) | `window.dataLayer.push({ event: name, ...params })` | GTM-managed sites      |
| `gtag`                | `window.gtag('event', name, params)`                | Direct GA4 measurement |

Set the global default with `.toGTMDefault()` or `.toGADefault()`. Override per-rule with `.toGA()` or `.toGTM()`.

If `window.dataLayer` or `window.gtag` don't exist when a push happens, the toolkit creates them automatically.

## Development

Requires Node.js 18+. All tasks run through Make:

```bash
make install          # Install dependencies + git hooks
make test             # Lint + run test suite (91 tests)
make test-coverage    # Lint + tests with coverage report
make test-watch       # Run tests in watch mode
make build            # Build dist/gtm-toolkit.js and dist/gtm-toolkit.min.js
make ci               # Full CI pipeline: install, test, build
make clean            # Remove dist/ and node_modules/
make help             # Show all available commands
```

### Project Structure

```
src/
  core.js               # Fluent builder API, transport, orchestration
  core.test.js           # 34 tests
  listeners.js           # Link, selector, and form event binding
  listeners.test.js      # 23 tests
  signals.js             # Cookie-based user context signals
  signals.test.js        # 17 tests
  test-panel.js          # Floating debug panel (Tag Assistant only)
  test-panel.test.js     # 12 tests
scripts/
  build.js               # Concatenates src/ modules into dist/ bundle
dist/
  gtm-toolkit.js         # Full bundle (unminified, ~28 KB)
  gtm-toolkit.min.js     # Minified bundle (~9 KB)
```

### Architecture

The toolkit is built as four independent IIFEs that share state through `window.GTMToolkit`:

```
core.js ──────> listeners.js    (core._bindListeners)
          ├──> signals.js       (core._runSignals)
          └──> test-panel.js    (core._renderTestPanel)
```

**Build order matters**: `core.js` must load first. The build script (`scripts/build.js`) concatenates modules in explicit order, then minifies with Terser.

Each module attaches a private method to `GTMToolkit` (e.g., `_bindListeners`) that `core.js` calls during `.start()`. Modules are optional -- if `signals.js` is not loaded, `.start()` skips the signals phase.

### Testing

Tests use Jest with jsdom. Source files are loaded via `require()` so Jest can instrument them for coverage.

```bash
make test               # Lint + tests
make test-coverage      # With coverage report
make test-verbose       # With per-test output
```

Coverage (as of v2.0.0):

| File          | Statements | Branches | Functions | Lines     |
| ------------- | ---------- | -------- | --------- | --------- |
| signals.js    | 100%       | 100%     | 100%      | 100%      |
| test-panel.js | 100%       | 90.9%    | 100%      | 100%      |
| core.js       | 98.4%      | 80.8%    | 100%      | 98.3%     |
| listeners.js  | 96.1%      | 86.4%    | 100%      | 96.7%     |
| **Overall**   | **98.2%**  | **87%**  | **100%**  | **98.4%** |

## Migration from v1

v2.0.0 replaces the config-object API (`GTMToolkit.init({...})`) with a fluent builder:

```diff
- GTMToolkit.init({
-   debug: true,
-   eventTracker: {
-     linkPatterns: [
-       { pattern: /^tel:/i, event: 'click_phone', mobileOnly: true }
-     ],
-     clickPatterns: [
-       { selector: '.chat-btn', event: 'click_chat' }
-     ],
-     formPatterns: [
-       { formSelector: '.gform', successSelector: '.success', event: 'form_done' }
-     ]
-   },
-   userQualifier: {
-     cookieExpiry: 30
-   }
- });

+ GTMToolkit
+   .debug(true)
+   .cookieExpiry(30)
+   .onLinkClick(/^tel:/i, 'click_phone').onlyMobile()
+   .onSelectorClick('.chat-btn', 'click_chat')
+   .onFormSubmit('.gform', '.success', 'form_done')
+   .start();
```

### Breaking Changes

- `GTMToolkit.init()` no longer exists. Use the fluent API + `.start()`.
- `eventTracker.linkPatterns[].pattern` is now the first argument to `.onLinkClick()`.
- `eventTracker.clickPatterns` is now `.onSelectorClick()`.
- `eventTracker.formPatterns` is now `.onFormSubmit()`.
- `userQualifier.checks` are no longer individually togglable. All signals always run.
- `eventTracker.deviceDetector` (custom function) is removed. UAParser + built-in regex remain.
- Link matching now supports strings and string arrays in addition to RegExp.

## License

MIT
