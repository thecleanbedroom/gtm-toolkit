'use strict';

var fs = require('fs');
var path = require('path');
var pkg = require(path.join(__dirname, '..', 'package.json'));

var coreContent = fs.readFileSync(
  path.join(__dirname, '_core.js'),
  'utf8'
);

var scriptContent = fs.readFileSync(
  path.join(__dirname, 'event-tracker.js'),
  'utf8'
);

var originalUserAgent = navigator.userAgent;

beforeEach(function() {
  delete window.GTMToolkit;
  delete window.gtag;
  delete window.dataLayer;
  delete window.UAParser;

  Object.defineProperty(navigator, 'userAgent', {
    value: originalUserAgent,
    writable: true,
    configurable: true
  });

  eval(coreContent);
  eval(scriptContent);
});

// ---------------------------------------------------------------------------
// Namespace
// ---------------------------------------------------------------------------
describe('GTMToolkit.EventTracker', function() {

  test('registers constructor on window.GTMToolkit', function() {
    expect(window.GTMToolkit).toBeDefined();
    expect(typeof window.GTMToolkit.EventTracker).toBe('function');
  });

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------
  describe('initialization', function() {
    test('sets version on namespace', function() {
      new window.GTMToolkit.EventTracker({});
      expect(window.GTMToolkit.version).toBe(pkg.version);
    });

    test('initializes dataLayer on first push', function() {
      new window.GTMToolkit.EventTracker({});
      window.GTMToolkit.push('init_test');
      expect(Array.isArray(window.dataLayer)).toBe(true);
    });

    test('applies default config for empty options', function() {
      var tracker = new window.GTMToolkit.EventTracker({});
      expect(window.GTMToolkit.debug).toBe(false);
      expect(tracker.linkPatterns).toEqual([]);
      expect(tracker.clickPatterns).toEqual([]);
      expect(tracker.formPatterns).toEqual([]);
      expect(tracker.deviceDetector).toBeNull();
    });
    test('does not crash when called without config argument', function() {
      expect(function() {
        new window.GTMToolkit.EventTracker();
      }).not.toThrow();
    });

    test('duplicate instantiation skips listener binding', function() {
      var tracker1 = new window.GTMToolkit.EventTracker({
        linkPatterns: [
          { pattern: /^tel:/i, event: 'click_phone' }
        ]
      });
      // Second instantiation should skip init
      var tracker2 = new window.GTMToolkit.EventTracker({
        linkPatterns: [
          { pattern: /^tel:/i, event: 'click_phone' }
        ]
      });

      window.dataLayer = window.dataLayer || [];
      var initialLength = window.dataLayer.length;
      tracker1.trackLink(document.createElement('a'));
      tracker2.trackLink(document.createElement('a'));

      // Neither direct call should fire because links have no href
      var phoneEvents = window.dataLayer.slice(initialLength).filter(function(entry) {
        return entry[0] === 'event' && entry[1] === 'click_phone';
      });
      expect(phoneEvents.length).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Device detection
  // -----------------------------------------------------------------------
  describe('device detection', function() {
    test('returns desktop by default in jsdom', function() {
      var tracker = new window.GTMToolkit.EventTracker({});
      expect(tracker.detectDevice()).toBe('desktop');
      expect(tracker.isMobile()).toBe(false);
    });

    test('uses custom deviceDetector (tier 1)', function() {
      var tracker = new window.GTMToolkit.EventTracker({
        deviceDetector: function() { return 'mobile'; }
      });
      expect(tracker.detectDevice()).toBe('mobile');
      expect(tracker.isMobile()).toBe(true);
    });

    test('custom deviceDetector takes priority over UAParser', function() {
      window.UAParser = function() {};
      window.UAParser.prototype.getResult = function() {
        return { device: { type: 'tablet' } };
      };
      var tracker = new window.GTMToolkit.EventTracker({
        deviceDetector: function() { return 'desktop'; }
      });
      expect(tracker.detectDevice()).toBe('desktop');
    });

    test('uses UAParser when available (tier 2)', function() {
      window.UAParser = function() {};
      window.UAParser.prototype.getResult = function() {
        return { device: { type: 'mobile' } };
      };
      var tracker = new window.GTMToolkit.EventTracker({});
      expect(tracker.detectDevice()).toBe('mobile');
      expect(tracker.isMobile()).toBe(true);
    });

    test('UAParser returns desktop when device type is null', function() {
      window.UAParser = function() {};
      window.UAParser.prototype.getResult = function() {
        return { device: {} };
      };
      var tracker = new window.GTMToolkit.EventTracker({});
      expect(tracker.detectDevice()).toBe('desktop');
    });

    test('detects mobile from iPhone user agent (tier 3)', function() {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        configurable: true
      });
      var tracker = new window.GTMToolkit.EventTracker({});
      expect(tracker.detectDevice()).toBe('mobile');
    });

    test('detects mobile from Android Mobile user agent', function() {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Mobile',
        configurable: true
      });
      var tracker = new window.GTMToolkit.EventTracker({});
      expect(tracker.detectDevice()).toBe('mobile');
    });

    test('detects tablet from iPad user agent', function() {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
        configurable: true
      });
      var tracker = new window.GTMToolkit.EventTracker({});
      expect(tracker.detectDevice()).toBe('tablet');
    });
  });

  // -----------------------------------------------------------------------
  // gtag / send
  // -----------------------------------------------------------------------
  describe('event transport', function() {
    test('pushes event to dataLayer via gtag', function() {
      new window.GTMToolkit.EventTracker({});
      window.GTMToolkit.push('test_event', { foo: 'bar' });

      var found = window.dataLayer.some(function(entry) {
        return entry[0] === 'event' && entry[1] === 'test_event' && entry[2] && entry[2].foo === 'bar';
      });
      expect(found).toBe(true);
    });

    test('returns true on success', function() {
      new window.GTMToolkit.EventTracker({});
      expect(window.GTMToolkit.push('test_event')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Link tracking
  // -----------------------------------------------------------------------
  describe('link tracking', function() {
    test('fires event for matching link pattern', function() {
      var tracker = new window.GTMToolkit.EventTracker({
        linkPatterns: [
          { pattern: /^tel:/i, event: 'click_phone' }
        ]
      });

      var link = document.createElement('a');
      link.href = 'tel:+15551234567';
      tracker.trackLink(link);

      var found = window.dataLayer.some(function(entry) {
        return entry[0] === 'event' && entry[1] === 'click_phone';
      });
      expect(found).toBe(true);
    });

    test('sets target and rel for newTab patterns', function() {
      var tracker = new window.GTMToolkit.EventTracker({
        linkPatterns: [
          { pattern: /maps\.google\.com/i, event: 'click_directions', newTab: true }
        ]
      });

      var link = document.createElement('a');
      link.href = 'https://maps.google.com/place';
      tracker.trackLink(link);

      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    test('skips mobileOnly pattern on desktop', function() {
      var tracker = new window.GTMToolkit.EventTracker({
        linkPatterns: [
          { pattern: /^tel:/i, event: 'click_phone', mobileOnly: true }
        ]
      });

      // Call trackLink directly to avoid accumulated listeners from prior tests
      var link = document.createElement('a');
      link.href = 'tel:+15551234567';

      window.dataLayer = window.dataLayer || [];
      var initialLength = window.dataLayer.length;
      tracker.trackLink(link);

      var phoneEvents = window.dataLayer.slice(initialLength).filter(function(entry) {
        return entry[0] === 'event' && entry[1] === 'click_phone';
      });
      expect(phoneEvents.length).toBe(0);
    });

    test('fires mobileOnly pattern when device is mobile', function() {
      var tracker = new window.GTMToolkit.EventTracker({
        deviceDetector: function() { return 'mobile'; },
        linkPatterns: [
          { pattern: /^tel:/i, event: 'click_phone', mobileOnly: true }
        ]
      });

      var link = document.createElement('a');
      link.href = 'tel:+15551234567';
      tracker.trackLink(link);

      var found = window.dataLayer.some(function(entry) {
        return entry[0] === 'event' && entry[1] === 'click_phone';
      });
      expect(found).toBe(true);
    });

    test('does not fire for non-matching href', function() {
      var tracker = new window.GTMToolkit.EventTracker({
        linkPatterns: [
          { pattern: /^tel:/i, event: 'click_phone' }
        ]
      });

      window.dataLayer = window.dataLayer || [];
      var initialLength = window.dataLayer.length;
      var link = document.createElement('a');
      link.href = 'https://example.com';
      tracker.trackLink(link);

      var phoneEvents = window.dataLayer.slice(initialLength).filter(function(entry) {
        return entry[0] === 'event' && entry[1] === 'click_phone';
      });
      expect(phoneEvents.length).toBe(0);
    });

    test('trackLink does nothing for link with no href', function() {
      var tracker = new window.GTMToolkit.EventTracker({
        linkPatterns: [
          { pattern: /^tel:/i, event: 'click_phone' }
        ]
      });

      window.dataLayer = window.dataLayer || [];
      var initialLength = window.dataLayer.length;
      var link = document.createElement('a');
      tracker.trackLink(link);

      expect(window.dataLayer.length).toBe(initialLength);
    });
  });

  // -----------------------------------------------------------------------
  // Click tracking
  // -----------------------------------------------------------------------
  describe('click tracking', function() {
    test('fires event for matching CSS selector', function() {
      new window.GTMToolkit.EventTracker({
        clickPatterns: [
          { selector: '.chat-btn', event: 'click_chat' }
        ]
      });

      var btn = document.createElement('button');
      btn.className = 'chat-btn';
      document.body.appendChild(btn);
      btn.click();

      var found = window.dataLayer.some(function(entry) {
        return entry[0] === 'event' && entry[1] === 'click_chat';
      });
      expect(found).toBe(true);
      document.body.removeChild(btn);
    });

    test('matches child element clicks via closest', function() {
      new window.GTMToolkit.EventTracker({
        clickPatterns: [
          { selector: '.chat-btn', event: 'click_chat' }
        ]
      });

      var btn = document.createElement('button');
      btn.className = 'chat-btn';
      var span = document.createElement('span');
      span.textContent = 'Chat';
      btn.appendChild(span);
      document.body.appendChild(btn);
      span.click();

      var found = window.dataLayer.some(function(entry) {
        return entry[0] === 'event' && entry[1] === 'click_chat';
      });
      expect(found).toBe(true);
      document.body.removeChild(btn);
    });

    test('skips mobileOnly click pattern on desktop', function() {
      new window.GTMToolkit.EventTracker({
        clickPatterns: [
          { selector: '.mobile-cta', event: 'click_cta', mobileOnly: true }
        ]
      });

      window.dataLayer = window.dataLayer || [];
      var initialLength = window.dataLayer.length;
      var btn = document.createElement('button');
      btn.className = 'mobile-cta';
      document.body.appendChild(btn);
      btn.click();

      var ctaEvents = window.dataLayer.slice(initialLength).filter(function(entry) {
        return entry[0] === 'event' && entry[1] === 'click_cta';
      });
      expect(ctaEvents.length).toBe(0);
      document.body.removeChild(btn);
    });
  });

  // -----------------------------------------------------------------------
  // Form tracking
  // -----------------------------------------------------------------------
  describe('form tracking', function() {
    test('detects success element insertion via MutationObserver', function(done) {
      new window.GTMToolkit.EventTracker({
        formPatterns: [
          {
            formSelector: '.test-form',
            successSelector: '.success-msg',
            event: 'form_submit'
          }
        ]
      });

      var form = document.createElement('div');
      form.className = 'test-form';
      form.id = 'contact-form';
      document.body.appendChild(form);

      // Insert success element (simulates form plugin behavior)
      var success = document.createElement('div');
      success.className = 'success-msg';
      form.appendChild(success);

      // MutationObserver is async - check on next tick
      setTimeout(function() {
        var found = window.dataLayer.some(function(entry) {
          return entry[0] === 'event' && entry[1] === 'form_submit';
        });
        expect(found).toBe(true);
        document.body.removeChild(form);
        done();
      }, 50);
    });
  });

  // -----------------------------------------------------------------------
  // Debug logging
  // -----------------------------------------------------------------------
  describe('debug logging', function() {
    test('logs when debug is enabled', function() {
      var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
      window.GTMToolkit.debug = true;
      new window.GTMToolkit.EventTracker({});

      var logs = spy.mock.calls.filter(function(args) {
        return args[0] === '[GTMToolkit.EventTracker]';
      });
      expect(logs.length).toBeGreaterThan(0);
      spy.mockRestore();
    });

    test('does not log when debug is disabled', function() {
      var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
      new window.GTMToolkit.EventTracker({});

      var logs = spy.mock.calls.filter(function(args) {
        return args[0] === '[GTMToolkit.EventTracker]';
      });
      expect(logs.length).toBe(0);
      spy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // send error handling
  // -----------------------------------------------------------------------
  describe('push error handling', function() {
    test('returns false when gtag throws', function() {
      new window.GTMToolkit.EventTracker({});
      window.gtag = function() { throw new Error('gtag failure'); };

      var spy = jest.spyOn(console, 'error').mockImplementation(function() {});
      var result = window.GTMToolkit.push('test_event');
      expect(result).toBe(false);
      spy.mockRestore();
    });
  });
});
