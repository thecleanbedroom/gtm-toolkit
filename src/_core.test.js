'use strict';

var fs = require('fs');
var path = require('path');
var pkg = require(path.join(__dirname, '..', 'package.json'));

var coreContent = fs.readFileSync(
  path.join(__dirname, '_core.js'),
  'utf8'
);

beforeEach(function() {
  delete window.GTMToolkit;
  delete window.gtag;
  delete window.dataLayer;
  delete window.__TAG_ASSISTANT_API;

  // Reset location search
  Object.defineProperty(window, 'location', {
    value: { href: 'https://example.com/', search: '', hostname: 'example.com' },
    writable: true,
    configurable: true
  });

  // Clear cookies
  document.cookie.split(';').forEach(function(c) {
    var name = c.trim().split('=')[0];
    if (name) {
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    }
  });

  eval(coreContent);
});

// ---------------------------------------------------------------------------
// Namespace
// ---------------------------------------------------------------------------
describe('GTMToolkit Core', function() {

  test('exposes GTMToolkit on window', function() {
    expect(window.GTMToolkit).toBeDefined();
  });

  test('sets version matching package.json', function() {
    expect(window.GTMToolkit.version).toBe(pkg.version);
  });

  test('debug defaults to false', function() {
    expect(window.GTMToolkit.debug).toBe(false);
  });

  // -----------------------------------------------------------------------
  // createLogger
  // -----------------------------------------------------------------------
  describe('createLogger', function() {
    test('returns object with log and error functions', function() {
      var logger = window.GTMToolkit.createLogger('[Test]');
      expect(typeof logger.log).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    test('log suppresses output when debug is false', function() {
      var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
      var logger = window.GTMToolkit.createLogger('[Test]');
      logger.log('hello');
      var calls = spy.mock.calls.filter(function(a) { return a[0] === '[Test]'; });
      expect(calls.length).toBe(0);
      spy.mockRestore();
    });

    test('log emits output when debug is true', function() {
      var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
      window.GTMToolkit.debug = true;
      var logger = window.GTMToolkit.createLogger('[Test]');
      logger.log('hello');
      var calls = spy.mock.calls.filter(function(a) { return a[0] === '[Test]'; });
      expect(calls.length).toBe(1);
      expect(calls[0][1]).toBe('hello');
      spy.mockRestore();
    });

    test('error always emits regardless of debug flag', function() {
      var spy = jest.spyOn(console, 'error').mockImplementation(function() {});
      var logger = window.GTMToolkit.createLogger('[Test]');
      logger.error('boom');
      var calls = spy.mock.calls.filter(function(a) { return a[0] === '[Test]'; });
      expect(calls.length).toBe(1);
      expect(calls[0][1]).toBe('boom');
      spy.mockRestore();
    });

    test('log passes multiple arguments with prefix', function() {
      var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
      window.GTMToolkit.debug = true;
      var logger = window.GTMToolkit.createLogger('[Multi]');
      logger.log('a', 'b', 'c');
      var calls = spy.mock.calls.filter(function(a) { return a[0] === '[Multi]'; });
      expect(calls[0]).toEqual(['[Multi]', 'a', 'b', 'c']);
      spy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // _ensureTransport
  // -----------------------------------------------------------------------
  describe('_ensureTransport', function() {
    test('creates gtag function when missing', function() {
      window.GTMToolkit._ensureTransport();
      expect(typeof window.gtag).toBe('function');
    });

    test('creates dataLayer array when missing', function() {
      window.GTMToolkit._ensureTransport();
      expect(Array.isArray(window.dataLayer)).toBe(true);
    });

    test('preserves existing gtag function', function() {
      var custom = function() {};
      window.gtag = custom;
      window.GTMToolkit._ensureTransport();
      expect(window.gtag).toBe(custom);
    });

    test('shim pushes Arguments objects to dataLayer', function() {
      window.GTMToolkit._ensureTransport();
      window.gtag('event', 'test_shim', { value: 1 });
      var found = window.dataLayer.some(function(entry) {
        return entry[0] === 'event' && entry[1] === 'test_shim';
      });
      expect(found).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // push
  // -----------------------------------------------------------------------
  describe('push', function() {
    test('returns true on success', function() {
      expect(window.GTMToolkit.push('test_event')).toBe(true);
    });

    test('pushes event through gtag', function() {
      window.GTMToolkit.push('my_event', { foo: 'bar' });
      var found = window.dataLayer.some(function(entry) {
        return entry[0] === 'event' && entry[1] === 'my_event' && entry[2] && entry[2].foo === 'bar';
      });
      expect(found).toBe(true);
    });

    test('defaults params to empty object', function() {
      window.GTMToolkit.push('no_params');
      var found = window.dataLayer.some(function(entry) {
        return entry[0] === 'event' && entry[1] === 'no_params';
      });
      expect(found).toBe(true);
    });

    test('returns false when gtag throws', function() {
      window.gtag = function() { throw new Error('broken'); };
      var spy = jest.spyOn(console, 'error').mockImplementation(function() {});
      expect(window.GTMToolkit.push('fail_event')).toBe(false);
      spy.mockRestore();
    });

    test('logs error when push fails', function() {
      window.gtag = function() { throw new Error('broken'); };
      var spy = jest.spyOn(console, 'error').mockImplementation(function() {});
      window.GTMToolkit.push('fail_event');
      var errorCalls = spy.mock.calls.filter(function(a) { return a[0] === '[GTMToolkit]'; });
      expect(errorCalls.length).toBeGreaterThan(0);
      spy.mockRestore();
    });

    test('logs with source prefix when source param provided', function() {
      var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
      window.GTMToolkit.debug = true;
      window.GTMToolkit.push('test_event', { x: 1 }, '[TestModule]');
      var calls = spy.mock.calls.filter(function(a) {
        return a[0] === '[TestModule]' && a[1] === 'Push:';
      });
      expect(calls.length).toBe(1);
      expect(calls[0][2]).toBe('test_event');
      spy.mockRestore();
    });

    test('does not log when source param is omitted', function() {
      var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
      window.GTMToolkit.debug = true;
      window.GTMToolkit.push('test_event');
      var calls = spy.mock.calls.filter(function(a) {
        return a[1] === 'Push:';
      });
      expect(calls.length).toBe(0);
      spy.mockRestore();
    });

    test('uses source in error log when push fails with source', function() {
      window.gtag = function() { throw new Error('broken'); };
      var spy = jest.spyOn(console, 'error').mockImplementation(function() {});
      window.GTMToolkit.push('fail_event', {}, '[TestModule]');
      var errorCalls = spy.mock.calls.filter(function(a) { return a[0] === '[TestModule]'; });
      expect(errorCalls.length).toBeGreaterThan(0);
      spy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // init
  // -----------------------------------------------------------------------
  describe('init', function() {
    test('sets debug from config', function() {
      window.GTMToolkit.init({ debug: true });
      expect(window.GTMToolkit.debug).toBe(true);
    });

    test('defaults to non-debug', function() {
      window.GTMToolkit.init({});
      expect(window.GTMToolkit.debug).toBe(false);
    });

    test('handles missing config argument', function() {
      expect(function() { window.GTMToolkit.init(); }).not.toThrow();
    });

    test('duplicate init is ignored', function() {
      var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
      window.GTMToolkit.init({ debug: true });
      window.GTMToolkit.init({ debug: false }); // should be ignored
      expect(window.GTMToolkit.debug).toBe(true); // still from first init
      spy.mockRestore();
    });

    test('duplicate init logs warning always', function() {
      var spy = jest.spyOn(console, 'warn').mockImplementation(function() {});
      var logSpy = jest.spyOn(console, 'log').mockImplementation(function() {});
      window.GTMToolkit.init({});
      window.GTMToolkit.init({});
      var warnings = spy.mock.calls.filter(function(a) {
        return a[0].indexOf('[GTMToolkit]') !== -1 && a[0].indexOf('init()') !== -1;
      });
      expect(warnings.length).toBe(1);
      spy.mockRestore();
      logSpy.mockRestore();
    });

    test('auto-enables debug when Tag Assistant API is present', function() {
      window.__TAG_ASSISTANT_API = {};
      window.GTMToolkit.init({});
      expect(window.GTMToolkit.debug).toBe(true);
    });

    test('auto-enables debug when gtm_debug is in URL', function() {
      window.location = { href: 'https://example.com/?gtm_debug=true', search: '?gtm_debug=true', hostname: 'example.com' };
      window.GTMToolkit.init({});
      expect(window.GTMToolkit.debug).toBe(true);
    });

    test('auto-enables debug when gtm_debug is in cookie', function() {
      document.cookie = 'gtm_debug=x;path=/';
      window.GTMToolkit.init({});
      expect(window.GTMToolkit.debug).toBe(true);
    });

    test('collects events from eventTracker config', function() {
      window.GTMToolkit.init({
        eventTracker: {
          linkPatterns: [{ pattern: /^tel:/i, event: 'click_phone' }],
          clickPatterns: [{ selector: '.cta', event: 'click_cta' }],
          formPatterns: [{ formSelector: '.form', successSelector: '.ok', event: 'form_done' }]
        }
      });
      expect(window.GTMToolkit.registeredEvents).toContain('click_phone');
      expect(window.GTMToolkit.registeredEvents).toContain('click_cta');
      expect(window.GTMToolkit.registeredEvents).toContain('form_done');
    });

    test('collects events from userQualifier config', function() {
      window.GTMToolkit.init({ userQualifier: {} });
      expect(window.GTMToolkit.registeredEvents).toContain('ga_user_include');
      expect(window.GTMToolkit.registeredEvents).toContain('hasGclid');
    });

    test('excludes userQualifier events when checks disabled', function() {
      window.GTMToolkit.init({
        userQualifier: { checks: { include: false, gclid: false } }
      });
      expect(window.GTMToolkit.registeredEvents).not.toContain('ga_user_include');
      expect(window.GTMToolkit.registeredEvents).not.toContain('hasGclid');
    });

    test('delegates to EventTracker constructor when present', function() {
      var called = false;
      window.GTMToolkit.EventTracker = function(cfg) { called = true; };
      window.GTMToolkit.init({ eventTracker: { linkPatterns: [] } });
      expect(called).toBe(true);
    });

    test('delegates to UserQualifier constructor when present', function() {
      var called = false;
      window.GTMToolkit.UserQualifier = function(cfg) { called = true; };
      window.GTMToolkit.init({ userQualifier: {} });
      expect(called).toBe(true);
    });

    test('does not call module when config is missing', function() {
      var etCalled = false;
      var uqCalled = false;
      window.GTMToolkit.EventTracker = function() { etCalled = true; };
      window.GTMToolkit.UserQualifier = function() { uqCalled = true; };
      window.GTMToolkit.init({});
      expect(etCalled).toBe(false);
      expect(uqCalled).toBe(false);
    });

    test('renders test panel when Tag Assistant is active', function() {
      window.__TAG_ASSISTANT_API = {};
      window.GTMToolkit.init({
        debug: true,
        eventTracker: {
          linkPatterns: [{ pattern: /^tel:/i, event: 'click_phone' }]
        }
      });
      // Panel should be appended to body - find by z-index value
      var divs = document.querySelectorAll('div');
      var panel = Array.from(divs).find(function(d) {
        return d.style.zIndex === '2147483647';
      });
      expect(panel).not.toBeNull();
    });

    test('does not render test panel without Tag Assistant', function() {
      window.GTMToolkit.init({
        debug: true,
        eventTracker: {
          linkPatterns: [{ pattern: /^tel:/i, event: 'click_phone' }]
        }
      });
      var panel = document.querySelector('[style*="position:fixed"]');
      expect(panel).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // _renderTestPanel
  // -----------------------------------------------------------------------
  describe('test panel rendering', function() {
    beforeEach(function() {
      window.__TAG_ASSISTANT_API = {};
    });

    test('generates link elements from linkPatterns', function() {
      window.GTMToolkit.init({
        eventTracker: {
          linkPatterns: [
            { pattern: /^tel:/i, event: 'click_phone' },
            { pattern: /^mailto:/i, event: 'click_email' },
            { pattern: /maps\.google/i, event: 'click_directions' }
          ]
        }
      });
      var links = document.querySelectorAll('a[href="tel:+15551234567"]');
      expect(links.length).toBeGreaterThan(0);

      var mailLinks = document.querySelectorAll('a[href="mailto:test@example.com"]');
      expect(mailLinks.length).toBeGreaterThan(0);

      var mapLinks = document.querySelectorAll('a[href*="maps.google"]');
      expect(mapLinks.length).toBeGreaterThan(0);
    });

    test('generates button elements from clickPatterns', function() {
      window.GTMToolkit.init({
        eventTracker: {
          clickPatterns: [{ selector: '.chat-btn', event: 'click_chat' }]
        }
      });
      var buttons = document.querySelectorAll('button.chat-btn');
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('generates form simulate buttons', function() {
      window.GTMToolkit.init({
        eventTracker: {
          formPatterns: [{ formSelector: '.test-form', successSelector: '.ok', event: 'form_done' }]
        }
      });
      var formBtns = document.querySelectorAll('button');
      var found = Array.from(formBtns).some(function(b) {
        return b.textContent.indexOf('form_done') !== -1;
      });
      expect(found).toBe(true);
    });

    test('form simulate button creates success element when form exists', function() {
      var form = document.createElement('div');
      form.className = 'test-form';
      document.body.appendChild(form);

      window.GTMToolkit.init({
        eventTracker: {
          formPatterns: [{ formSelector: '.test-form', successSelector: '.ok', event: 'form_done' }]
        }
      });

      // Click the simulate button
      var formBtns = document.querySelectorAll('button');
      var simBtn = Array.from(formBtns).find(function(b) {
        return b.textContent.indexOf('form_done') !== -1;
      });
      simBtn.click();

      expect(form.querySelector('.ok')).not.toBeNull();
      document.body.removeChild(form);
    });

    test('form simulate button warns when form is not found', function() {
      var spy = jest.spyOn(console, 'warn').mockImplementation(function() {});
      window.GTMToolkit.init({
        eventTracker: {
          formPatterns: [{ formSelector: '.missing-form', successSelector: '.ok', event: 'form_done' }]
        }
      });

      var formBtns = document.querySelectorAll('button');
      var simBtn = Array.from(formBtns).find(function(b) {
        return b.textContent.indexOf('form_done') !== -1;
      });
      simBtn.click();

      var warns = spy.mock.calls.filter(function(a) {
        return a[0].indexOf('GTMToolkit Test') !== -1;
      });
      expect(warns.length).toBe(1);
      spy.mockRestore();
    });

    test('displays version in panel label', function() {
      window.GTMToolkit.init({
        eventTracker: { linkPatterns: [{ pattern: /^tel:/, event: 'test' }] }
      });
      var spans = document.querySelectorAll('span');
      var label = Array.from(spans).find(function(s) {
        return s.textContent.indexOf('GTM Toolkit') !== -1;
      });
      expect(label).not.toBeNull();
      expect(label.textContent).toContain(pkg.version);
    });

    test('marks mobileOnly patterns in label', function() {
      window.GTMToolkit.init({
        eventTracker: {
          linkPatterns: [{ pattern: /^tel:/i, event: 'click_phone', mobileOnly: true }]
        }
      });
      var links = document.querySelectorAll('a[href="tel:+15551234567"]');
      var found = Array.from(links).some(function(l) {
        return l.textContent.indexOf('(mobile)') !== -1;
      });
      expect(found).toBe(true);
    });
  });
});
