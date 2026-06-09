# GTM Toolkit

Configurable event tracking and user qualification for GA4/GTM. Drop-in JavaScript library that fires `gtag` events from link clicks, CSS selector matches, form submissions, and cookie-based user signals -- all via a single `GTMToolkit.init()` call.

## Quick Start

Load the minified bundle from jsDelivr and initialize:

```html
<script src="https://cdn.jsdelivr.net/gh/thecleanbedroom/gtm-toolkit@main/dist/gtm-toolkit.min.js"></script>
<script>
  GTMToolkit.init({
    debug: true,
    eventTracker: {
      linkPatterns: [
        { pattern: /^tel:/i, event: 'click_phone', mobileOnly: true },
        { pattern: /^mailto:/i, event: 'click_email' },
        { pattern: /(goo\.gl\/maps|google\.com\/maps|maps\.google\.com|maps\.app\.goo\.gl)/i, event: 'click_directions', newTab: true }
      ],
      clickPatterns: [
        { selector: '.chat-open-link', event: 'click_chat' }
      ],
      formPatterns: [
        { formSelector: '.frm-fluent-form', successSelector: '.ff-message-success', event: 'form_submit' }
      ]
    },
    userQualifier: {
      cookieExpiry: 30,
      checks: {
        hasJs: true,
        pageCount: true,
        include: true,
        gclid: true
      }
    }
  });
</script>
```

Place this in a **GTM Custom HTML tag** or before `</body>` in your site's HTML.

## Complete Configuration

```html
<script src="https://cdn.jsdelivr.net/gh/thecleanbedroom/gtm-toolkit@main/dist/gtm-toolkit.min.js"></script>
<script>
  GTMToolkit.init({

    // Global: verbose console logging for all modules
    debug: false,

    // ---------------------------------------------------------------
    // EventTracker
    // Binds delegated listeners on document for clicks and a
    // MutationObserver for form submissions. No events fire until
    // a user actually interacts.
    // ---------------------------------------------------------------
    eventTracker: {

      // Link patterns: match <a> clicks by href regex
      linkPatterns: [
        // Track phone link taps, only on mobile devices
        { pattern: /^tel:/i, event: 'click_phone', mobileOnly: true },
        // Track email link clicks
        { pattern: /^mailto:/i, event: 'click_email' },
        // Track Google Maps links and force them to open in a new tab
        { pattern: /(goo\.gl\/maps|google\.com\/maps|maps\.app\.goo\.gl)/i, event: 'click_directions', newTab: true }
      ],

      // Click patterns: match any click by CSS selector (uses Element.closest,
      // so clicks on child elements bubble up to the matched parent)
      clickPatterns: [
        { selector: '.chat-open-link', event: 'click_chat' },
        { selector: '.mobile-cta', event: 'click_cta', mobileOnly: true }
      ],

      // Form patterns: detect AJAX form submissions by watching for a
      // success element inserted into the DOM inside a form container.
      // Works with Fluent Forms, WPForms, Gravity Forms, etc.
      formPatterns: [
        {
          formSelector: '.frm-fluent-form',
          successSelector: '.ff-message-success',
          event: 'form_submit'
        }
      ],

      // Optional: override the built-in device detector.
      // Must return 'mobile', 'tablet', or 'desktop'.
      // If UAParser.js is loaded on the page, it is used automatically.
      // deviceDetector: function() { return 'mobile'; }
    },

    // ---------------------------------------------------------------
    // UserQualifier
    // Sets cookies and pushes dataLayer events on every page load
    // to build GA4 audience segments.
    // ---------------------------------------------------------------
    userQualifier: {
      // Cookie lifetime in days
      cookieExpiry: 30,

      // Toggle individual checks (all default to true)
      checks: {
        hasJs: true,        // Sets ga_user_has_js=1 cookie (proves JS ran, filters bots)
        pageCount: true,    // Increments ga_user_page_views cookie (session depth)
        include: true,      // Pushes ga_user_include dataLayer event for returning visitors
        gclid: true         // Detects ?gclid= in URL, sets ga_user_from_ad cookie, pushes hasGclid event
      }

      // Optional: override default cookie names
      // keys: {
      //   pageViews: 'my_page_views',
      //   hasJs: 'my_has_js',
      //   include: 'my_include',
      //   gclid: 'my_from_ad'
      // }
    }
  });
</script>
```

### How It Works

On page load, `GTMToolkit.init()` activates each module in order:

**EventTracker** registers listeners but does not fire any events until the user interacts:
- **Link patterns** listen for `<a>` clicks, match the `href` against each regex, and call `gtag('event', ...)` on the first match.
- **Click patterns** listen for clicks anywhere on the page, walk up the DOM with `closest()` to find a matching selector.
- **Form patterns** start a `MutationObserver` on `document.body`, watching for a success element to appear inside the form container.
- **mobileOnly** skips the event if the device is not mobile. Detection uses a custom `deviceDetector` function if provided, then [UAParser.js](https://github.com/nicedayfor/ua-parser-js) if loaded, then a built-in regex + touch fallback.

**UserQualifier** runs all enabled checks immediately:
- **hasJs** sets a `ga_user_has_js` cookie to `1`. Visitors without JavaScript (bots, crawlers) never get this cookie.
- **pageCount** reads the current `ga_user_page_views` cookie, increments it, and writes it back. Tracks how deep into the session a user is.
- **include** checks if the user has visited before (page views > 0) and pushes a `ga_user_include` dataLayer event. Useful for GA4 audience segments that exclude first-time visitors.
- **gclid** scans the URL for a `gclid` parameter (Google Ads click ID), sets a `ga_user_from_ad` cookie, and pushes a `hasGclid` dataLayer event. The cookie persists across pages so the ad attribution survives navigation.

All cookies use `Secure` and `SameSite=Lax` attributes.

### Config Reference

#### `eventTracker.linkPatterns[]`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `pattern` | `RegExp` | Yes | Regex matched against the link's `href`. |
| `event` | `string` | Yes | The `gtag` event name to fire. |
| `mobileOnly` | `boolean` | No | Only fire on mobile devices. |
| `newTab` | `boolean` | No | Force the link to open in a new tab. |

#### `eventTracker.clickPatterns[]`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `selector` | `string` | Yes | CSS selector to match clicked elements. |
| `event` | `string` | Yes | The `gtag` event name to fire. |
| `mobileOnly` | `boolean` | No | Only fire on mobile devices. |

#### `eventTracker.formPatterns[]`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `formSelector` | `string` | Yes | CSS selector for the form container. |
| `successSelector` | `string` | Yes | CSS selector for the success element that appears on submission. |
| `event` | `string` | Yes | The `gtag` event name to fire. |

#### `userQualifier`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cookieExpiry` | `number` | `30` | Cookie lifetime in days. |
| `checks.hasJs` | `boolean` | `true` | Set a `ga_user_has_js` cookie. |
| `checks.pageCount` | `boolean` | `true` | Increment a `ga_user_page_views` cookie. |
| `checks.include` | `boolean` | `true` | Push `ga_user_include` event for returning visitors. |
| `checks.gclid` | `boolean` | `true` | Detect `gclid` in URL, set `ga_user_from_ad` cookie. |

## Development

Requires Node.js. All tasks run through Make:

```bash
make install        # Install dependencies
make update         # Update packages to latest compatible versions
make test           # Lint + run test suite
make build          # Build dist/gtm-toolkit.js and dist/gtm-toolkit.min.js
make ci             # Full CI pipeline: install, test, build
make clean          # Remove dist/ and node_modules/
make help           # Show all available commands
```

### Project Structure

```
src/
  _core.js              # Namespace, version, debug, logger factory, init()
  event-tracker.js      # Link, click, and form tracking module
  event-tracker.test.js # EventTracker test suite
  user-qualifier.js     # Cookie-based user qualification module
  user-qualifier.test.js# UserQualifier test suite
scripts/
  build.js              # Concatenates src/*.js into dist/ bundle
dist/
  gtm-toolkit.js        # Full bundle (unminified)
  gtm-toolkit.min.js    # Minified bundle for production
```

## License

MIT
