'use strict';

var fs = require('fs');
var path = require('path');
var pkg = require(path.join(__dirname, '..', 'package.json'));

var coreContent = fs.readFileSync(
  path.join(__dirname, '_core.js'),
  'utf8'
);

var scriptContent = fs.readFileSync(
  path.join(__dirname, 'user-qualifier.js'),
  'utf8'
);

var originalLocation;

beforeEach(function() {
  delete window.GTMToolkit;
  delete window.dataLayer;

  // Restore location if it was overridden
  if (originalLocation) {
    window.location = originalLocation;
    originalLocation = null;
  }

  // Clear all cookies
  document.cookie.split(';').forEach(function(c) {
    var name = c.trim().split('=')[0];
    if (name) {
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    }
  });

  eval(coreContent);
  eval(scriptContent);
});

// ---------------------------------------------------------------------------
// Namespace
// ---------------------------------------------------------------------------
describe('GTMToolkit.UserQualifier', function() {

  test('registers constructor on window.GTMToolkit', function() {
    expect(window.GTMToolkit).toBeDefined();
    expect(typeof window.GTMToolkit.UserQualifier).toBe('function');
  });

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------
  describe('initialization', function() {
    test('sets version on namespace', function() {
      new window.GTMToolkit.UserQualifier({});
      expect(window.GTMToolkit.version).toBe(pkg.version);
    });

    test('applies default config', function() {
      var q = new window.GTMToolkit.UserQualifier();
      expect(window.GTMToolkit.debug).toBe(false);
      expect(q.cookieExpiry).toBe(30);
      expect(q.keys.pageViews).toBe('ga_user_page_views');
      expect(q.keys.hasJs).toBe('ga_user_has_js');
      expect(q.keys.include).toBe('ga_user_include');
      expect(q.keys.gclid).toBe('ga_user_from_ad');
    });

    test('accepts config overrides', function() {
      var q = new window.GTMToolkit.UserQualifier({
        cookieExpiry: 7,
        keys: { pageViews: 'custom_pv', gclid: 'custom_gclid' }
      });
      expect(q.cookieExpiry).toBe(7);
      expect(q.keys.pageViews).toBe('custom_pv');
      expect(q.keys.gclid).toBe('custom_gclid');
      // Non-overridden keys keep defaults
      expect(q.keys.hasJs).toBe('ga_user_has_js');
    });

    test('all checks enabled by default', function() {
      var q = new window.GTMToolkit.UserQualifier({});
      expect(q.checks.hasJs).toBe(true);
      expect(q.checks.pageCount).toBe(true);
      expect(q.checks.include).toBe(true);
      expect(q.checks.gclid).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Cookie helpers
  // -----------------------------------------------------------------------
  describe('cookie operations', function() {
    test('setCookie and getCookie round-trip', function() {
      var q = new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, pageCount: false, include: false, gclid: false } });
      q.setCookie('test_key', 'test_value', 1);
      expect(q.getCookie('test_key')).toBe('test_value');
    });

    test('hasCookie returns true for existing cookie', function() {
      var q = new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, pageCount: false, include: false, gclid: false } });
      q.setCookie('exists', '1', 1);
      expect(q.hasCookie('exists')).toBe(true);
    });

    test('hasCookie returns false for missing cookie', function() {
      var q = new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, pageCount: false, include: false, gclid: false } });
      expect(q.hasCookie('nonexistent')).toBe(false);
    });

    test('removeCookie removes existing cookie', function() {
      var q = new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, pageCount: false, include: false, gclid: false } });
      q.setCookie('removable', '1', 1);
      expect(q.hasCookie('removable')).toBe(true);
      q.removeCookie('removable');
      expect(q.hasCookie('removable')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // dataLayer
  // -----------------------------------------------------------------------
  describe('dataLayer', function() {
    test('push creates dataLayer if missing', function() {
      delete window.dataLayer;
      var q = new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, pageCount: false, include: false, gclid: false } });
      q.push({ event: 'test' });
      expect(Array.isArray(window.dataLayer)).toBe(true);
    });

    test('push adds event to dataLayer', function() {
      var q = new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, pageCount: false, include: false, gclid: false } });
      q.push({ event: 'custom_event', value: 42 });
      var found = window.dataLayer.some(function(entry) {
        return entry.event === 'custom_event' && entry.value === 42;
      });
      expect(found).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // setHasJs
  // -----------------------------------------------------------------------
  describe('setHasJs', function() {
    test('sets JS cookie on first run', function() {
      var q = new window.GTMToolkit.UserQualifier({ checks: { pageCount: false, include: false, gclid: false } });
      expect(q.getCookie('ga_user_has_js')).toBe('1');
    });

    test('does not overwrite existing JS cookie', function() {
      // First run sets it
      var q1 = new window.GTMToolkit.UserQualifier({ checks: { pageCount: false, include: false, gclid: false } });
      expect(q1.getCookie('ga_user_has_js')).toBe('1');

      // Second run should not throw or change it
      var q2 = new window.GTMToolkit.UserQualifier({ checks: { pageCount: false, include: false, gclid: false } });
      expect(q2.getCookie('ga_user_has_js')).toBe('1');
    });
  });

  // -----------------------------------------------------------------------
  // setPageCount
  // -----------------------------------------------------------------------
  describe('setPageCount', function() {
    test('starts count at 1 on first page view', function() {
      var q = new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, include: false, gclid: false } });
      expect(q.getCookie('ga_user_page_views')).toBe('1');
    });

    test('increments count on subsequent runs', function() {
      // Simulate first page view
      var q1 = new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, include: false, gclid: false } });
      expect(q1.getCookie('ga_user_page_views')).toBe('1');

      // Simulate second page view (re-eval + new instance)
      eval(coreContent);
      eval(scriptContent);
      var q2 = new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, include: false, gclid: false } });
      expect(q2.getCookie('ga_user_page_views')).toBe('2');
    });
  });

  // -----------------------------------------------------------------------
  // setInclude
  // -----------------------------------------------------------------------
  describe('setInclude', function() {
    test('pushes include event when pageViews cookie exists', function() {
      // Pre-set a page view cookie to simulate a returning user
      document.cookie = 'ga_user_page_views=1;path=/';

      new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, pageCount: false, gclid: false } });

      var found = window.dataLayer.some(function(entry) {
        return entry.event === 'ga_user_include' && entry.value === 1;
      });
      expect(found).toBe(true);
    });

    test('does not push include event on first visit', function() {
      // No pre-existing pageViews cookie, and pageCount is disabled
      new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, pageCount: false, gclid: false } });

      var dl = window.dataLayer || [];
      var found = dl.some(function(entry) {
        return entry.event === 'ga_user_include';
      });
      expect(found).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // setHasGclid
  // -----------------------------------------------------------------------
  describe('setHasGclid', function() {
    test('detects gclid in URL', function() {
      originalLocation = window.location;
      delete window.location;
      window.location = { href: 'https://example.com/?gclid=abc123&utm_source=google' };

      var q = new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, pageCount: false, include: false } });
      expect(q.getCookie('ga_user_from_ad')).toBe('1');

      // Restore immediately so next test has clean location
      window.location = originalLocation;
      originalLocation = null;
    });

    test('sets gclid cookie to 0 when not in URL', function() {
      var q = new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, pageCount: false, include: false } });
      expect(q.getCookie('ga_user_from_ad')).toBe('0');
    });

    test('pushes hasGclid event on return visit with gclid cookie', function() {
      // Pre-set gclid cookie as if detected on a previous page
      document.cookie = 'ga_user_from_ad=1;path=/';

      new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, pageCount: false, include: false } });

      var found = window.dataLayer.some(function(entry) {
        return entry.event === 'hasGclid' && entry.value === 1;
      });
      expect(found).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Check toggling
  // -----------------------------------------------------------------------
  describe('check toggling', function() {
    test('disabling all checks skips all operations', function() {
      var q = new window.GTMToolkit.UserQualifier({
        checks: { hasJs: false, pageCount: false, include: false, gclid: false }
      });

      expect(q.hasCookie('ga_user_has_js')).toBe(false);
      expect(q.hasCookie('ga_user_page_views')).toBe(false);
      expect(q.hasCookie('ga_user_from_ad')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Debug logging
  // -----------------------------------------------------------------------
  describe('debug logging', function() {
    test('logs when debug is enabled', function() {
      var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
      window.GTMToolkit.debug = true;
      new window.GTMToolkit.UserQualifier({});

      var logs = spy.mock.calls.filter(function(args) {
        return args[0] === '[GTMToolkit.UserQualifier]';
      });
      expect(logs.length).toBeGreaterThan(0);
      spy.mockRestore();
    });

    test('does not log when debug is disabled', function() {
      var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
      window.GTMToolkit.debug = false;
      new window.GTMToolkit.UserQualifier({});

      var logs = spy.mock.calls.filter(function(args) {
        return args[0] === '[GTMToolkit.UserQualifier]';
      });
      expect(logs.length).toBe(0);
      spy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // Error-path / edge-case tests
  // -----------------------------------------------------------------------
  describe('error paths', function() {
    test('setPageCount recovers from corrupted (NaN) cookie value', function() {
      // Pre-set a non-numeric cookie value
      document.cookie = 'ga_user_page_views=abc;path=/';

      var q = new window.GTMToolkit.UserQualifier({ checks: { hasJs: false, include: false, gclid: false } });
      // NaN should be reset to 0, then incremented to 1
      expect(q.getCookie('ga_user_page_views')).toBe('1');
    });

    test('cookieExpiry of 0 is respected, not coerced to 30', function() {
      var q = new window.GTMToolkit.UserQualifier({
        cookieExpiry: 0,
        checks: { hasJs: false, pageCount: false, include: false, gclid: false }
      });
      expect(q.cookieExpiry).toBe(0);
    });
  });
});
