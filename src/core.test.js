/**
 * Core module tests
 */
'use strict';

// Require source files - Jest instruments these for coverage
require('./core.js');

var GTMToolkit;

beforeEach(function() {
    // Reset all state between tests
    window.GTMToolkit._reset();
    window.dataLayer = undefined;
    window.gtag = undefined;
    delete window.__TAG_ASSISTANT_API;
    GTMToolkit = window.GTMToolkit;
});

describe('GTMToolkit Core', function() {

    describe('Version', function() {
        it('should be 2.0.0', function() {
            expect(GTMToolkit.version).toBe('2.0.0');
        });
    });

    describe('Fluent API - Global configuration', function() {
        it('.toGTMDefault() sets default transport to dataLayer', function() {
            GTMToolkit.toGTMDefault();
            expect(GTMToolkit._getDefaultTransport()).toBe('dataLayer');
        });

        it('.toGADefault() sets default transport to gtag', function() {
            GTMToolkit.toGADefault();
            expect(GTMToolkit._getDefaultTransport()).toBe('gtag');
        });

        it('.cookieExpiry() sets cookie expiry', function() {
            GTMToolkit.cookieExpiry(60);
            expect(GTMToolkit._getCookieExpiry()).toBe(60);
        });

        it('.debug(true) enables debug mode', function() {
            GTMToolkit.debug(true);
            expect(GTMToolkit._getDebug()).toBe(true);
        });

        it('.debug(false) disables debug mode', function() {
            GTMToolkit.debug(true);
            GTMToolkit.debug(false);
            expect(GTMToolkit._getDebug()).toBe(false);
        });

        it('default transport is dataLayer', function() {
            expect(GTMToolkit._getDefaultTransport()).toBe('dataLayer');
        });

        it('default cookie expiry is 30', function() {
            expect(GTMToolkit._getCookieExpiry()).toBe(30);
        });
    });

    describe('Fluent API - Rule registration', function() {
        it('.onLinkClick() adds a link rule', function() {
            GTMToolkit.onLinkClick('tel:', 'click_phone');
            var rules = GTMToolkit._getRules();
            expect(rules.length).toBe(1);
            expect(rules[0].type).toBe('link');
            expect(rules[0].match).toBe('tel:');
            expect(rules[0].event).toBe('click_phone');
        });

        it('.onSelectorClick() adds a selector rule', function() {
            GTMToolkit.onSelectorClick('.chat-btn', 'click_chat');
            var rules = GTMToolkit._getRules();
            expect(rules.length).toBe(1);
            expect(rules[0].type).toBe('selector');
            expect(rules[0].selector).toBe('.chat-btn');
            expect(rules[0].event).toBe('click_chat');
        });

        it('.onFormSubmit() adds a form rule', function() {
            GTMToolkit.onFormSubmit('.gform', '.success', 'form_done');
            var rules = GTMToolkit._getRules();
            expect(rules.length).toBe(1);
            expect(rules[0].type).toBe('form');
            expect(rules[0].formSelector).toBe('.gform');
            expect(rules[0].successSelector).toBe('.success');
            expect(rules[0].event).toBe('form_done');
        });

        it('multiple rules accumulate', function() {
            GTMToolkit
                .onLinkClick('tel:', 'click_phone')
                .onLinkClick('mailto:', 'click_email')
                .onSelectorClick('.btn', 'click_btn')
                .onFormSubmit('.form', '.ok', 'form_ok');
            expect(GTMToolkit._getRules().length).toBe(4);
        });

        it('.onLinkClick() accepts array match', function() {
            GTMToolkit.onLinkClick(['goo.gl/maps', 'maps.google.com'], 'click_directions');
            var rules = GTMToolkit._getRules();
            expect(Array.isArray(rules[0].match)).toBe(true);
            expect(rules[0].match.length).toBe(2);
        });

        it('.onLinkClick() accepts RegExp match', function() {
            var pattern = /maps\.google\.com/i;
            GTMToolkit.onLinkClick(pattern, 'click_directions');
            var rules = GTMToolkit._getRules();
            expect(rules[0].match instanceof RegExp).toBe(true);
        });
    });

    describe('Fluent API - Modifiers', function() {
        it('.onlyMobile() sets mobileOnly on last rule', function() {
            GTMToolkit.onLinkClick('tel:', 'click_phone').onlyMobile();
            expect(GTMToolkit._getRules()[0].mobileOnly).toBe(true);
        });

        it('.newTab() sets newTab on last rule', function() {
            GTMToolkit.onLinkClick('tel:', 'click_phone').newTab();
            expect(GTMToolkit._getRules()[0].newTab).toBe(true);
        });

        it('.toGA() sets per-rule transport to gtag', function() {
            GTMToolkit.onLinkClick('tel:', 'click_phone').toGA();
            expect(GTMToolkit._getRules()[0].transport).toBe('gtag');
        });

        it('.toGTM() sets per-rule transport to dataLayer', function() {
            GTMToolkit.toGADefault().onLinkClick('tel:', 'click_phone').toGTM();
            expect(GTMToolkit._getRules()[0].transport).toBe('dataLayer');
        });

        it('modifiers only affect the last rule', function() {
            GTMToolkit
                .onLinkClick('tel:', 'click_phone')
                .onLinkClick('mailto:', 'click_email').onlyMobile().newTab();
            var rules = GTMToolkit._getRules();
            expect(rules[0].mobileOnly).toBe(false);
            expect(rules[0].newTab).toBe(false);
            expect(rules[1].mobileOnly).toBe(true);
            expect(rules[1].newTab).toBe(true);
        });

        it('chaining multiple modifiers works', function() {
            GTMToolkit.onLinkClick('tel:', 'click_phone').onlyMobile().newTab().toGA();
            var rule = GTMToolkit._getRules()[0];
            expect(rule.mobileOnly).toBe(true);
            expect(rule.newTab).toBe(true);
            expect(rule.transport).toBe('gtag');
        });
    });

    describe('Fluent API - Chaining', function() {
        it('all methods return GTMToolkit for chaining', function() {
            var result = GTMToolkit
                .toGTMDefault()
                .cookieExpiry(30)
                .debug(true)
                .onLinkClick('tel:', 'click_phone')
                .onlyMobile()
                .newTab()
                .toGA()
                .onSelectorClick('.btn', 'click')
                .onFormSubmit('.form', '.ok', 'done');
            expect(result).toBe(GTMToolkit);
        });
    });

    describe('Transport - push()', function() {
        it('pushes to dataLayer by default', function() {
            window.dataLayer = [];
            GTMToolkit.push('test_event', { key: 'val' });
            expect(window.dataLayer.length).toBe(1);
            expect(window.dataLayer[0].event).toBe('test_event');
            expect(window.dataLayer[0].key).toBe('val');
        });

        it('pushes via gtag when transport is gtag', function() {
            var gtagCalls = [];
            window.gtag = function() {
                gtagCalls.push(Array.prototype.slice.call(arguments));
            };
            GTMToolkit.push('test_event', { key: 'val' }, 'gtag');
            expect(gtagCalls.length).toBe(1);
            expect(gtagCalls[0][0]).toBe('event');
            expect(gtagCalls[0][1]).toBe('test_event');
            expect(gtagCalls[0][2].key).toBe('val');
        });

        it('creates dataLayer if it does not exist', function() {
            window.dataLayer = undefined;
            GTMToolkit.push('test_event', {});
            expect(Array.isArray(window.dataLayer)).toBe(true);
        });

        it('creates gtag shim if it does not exist', function() {
            window.dataLayer = [];
            window.gtag = undefined;
            GTMToolkit.push('test_event', {}, 'gtag');
            expect(typeof window.gtag).toBe('function');
        });

        it('returns true on success', function() {
            window.dataLayer = [];
            expect(GTMToolkit.push('test', {})).toBe(true);
        });

        it('returns false on error', function() {
            // Force an error by making dataLayer.push throw
            window.dataLayer = { push: function() { throw new Error('fail'); } };
            expect(GTMToolkit.push('test', {})).toBe(false);
        });

        it('preserves existing gtag function', function() {
            var custom = jest.fn();
            window.gtag = custom;
            GTMToolkit.push('test_event', { x: 1 }, 'gtag');
            expect(window.gtag).toBe(custom);
            expect(custom).toHaveBeenCalled();
        });

        it('logs error when push fails', function() {
            var spy = jest.spyOn(console, 'error').mockImplementation(function() {});
            window.dataLayer = { push: function() { throw new Error('broken'); } };
            GTMToolkit.push('fail_event', {});
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('logs push details when debug is enabled', function() {
            var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
            window.dataLayer = [];
            GTMToolkit.debug(true);
            GTMToolkit.push('test_event', { key: 'val' });
            var pushLogs = spy.mock.calls.filter(function(a) {
                return a[0] === '[GTMToolkit]' && typeof a[1] === 'string' && a[1].indexOf('Push') !== -1;
            });
            expect(pushLogs.length).toBe(1);
            spy.mockRestore();
        });
    });

    describe('Logger (createLogger)', function() {
        it('log suppresses output when debug is false', function() {
            var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
            var logger = GTMToolkit.createLogger('[Test]');
            logger.log('should not appear');
            var testCalls = spy.mock.calls.filter(function(a) { return a[0] === '[Test]'; });
            expect(testCalls.length).toBe(0);
            spy.mockRestore();
        });

        it('log emits output when debug is true', function() {
            var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
            GTMToolkit.debug(true);
            var logger = GTMToolkit.createLogger('[Test]');
            logger.log('hello');
            var testCalls = spy.mock.calls.filter(function(a) { return a[0] === '[Test]'; });
            expect(testCalls.length).toBe(1);
            spy.mockRestore();
        });

        it('error always emits regardless of debug flag', function() {
            var spy = jest.spyOn(console, 'error').mockImplementation(function() {});
            // debug is false
            var logger = GTMToolkit.createLogger('[Test]');
            logger.error('something broke');
            var errorCalls = spy.mock.calls.filter(function(a) { return a[0] === '[Test]'; });
            expect(errorCalls.length).toBe(1);
            spy.mockRestore();
        });

        it('passes multiple arguments with prefix', function() {
            var spy = jest.spyOn(console, 'log').mockImplementation(function() {});
            GTMToolkit.debug(true);
            var logger = GTMToolkit.createLogger('[Multi]');
            logger.log('a', 'b', 'c');
            var multiCalls = spy.mock.calls.filter(function(a) { return a[0] === '[Multi]'; });
            expect(multiCalls[0]).toEqual(['[Multi]', 'a', 'b', 'c']);
            spy.mockRestore();
        });
    });

    describe('.start()', function() {
        it('is idempotent - second call warns', function() {
            var spy = jest.spyOn(console, 'warn').mockImplementation(function() {});
            GTMToolkit.start();
            GTMToolkit.start();
            expect(spy).toHaveBeenCalledWith('[GTMToolkit] start() called again, ignoring.');
            spy.mockRestore();
        });

        it('collects registered event names', function() {
            GTMToolkit
                .onLinkClick('tel:', 'click_phone')
                .onSelectorClick('.btn', 'click_chat')
                .start();
            expect(GTMToolkit.registeredEvents).toEqual(['click_phone', 'click_chat']);
        });
    });

    describe('Debug auto-detection', function() {
        it('detects Tag Assistant API', function() {
            window.__TAG_ASSISTANT_API = {};
            GTMToolkit.start();
            expect(GTMToolkit._getDebug()).toBe(true);
        });

        it('detects gtm_debug URL parameter', function() {
            // jsdom doesn't let us set location.search directly, use defineProperty
            Object.defineProperty(window, 'location', {
                value: { search: '?gtm_debug=true', href: 'https://example.com/?gtm_debug=true' },
                writable: true,
                configurable: true
            });
            GTMToolkit.start();
            expect(GTMToolkit._getDebug()).toBe(true);
            // Restore
            Object.defineProperty(window, 'location', {
                value: { search: '', href: 'https://example.com' },
                writable: true,
                configurable: true
            });
        });

        it('detects gtm_debug cookie (properly anchored)', function() {
            document.cookie = 'gtm_debug=1';
            GTMToolkit.start();
            expect(GTMToolkit._getDebug()).toBe(true);
            // Cleanup
            document.cookie = 'gtm_debug=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
        });

        it('does not false-positive on cookie substring', function() {
            document.cookie = 'other_gtm_debug_thing=1';
            GTMToolkit.start();
            // The regex /(?:^|;\s*)gtm_debug=/ should NOT match 'other_gtm_debug_thing=1'
            expect(GTMToolkit._getDebug()).toBe(false);
            // Cleanup
            document.cookie = 'other_gtm_debug_thing=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
        });

        it('explicit .debug(false) overrides auto-detection', function() {
            window.__TAG_ASSISTANT_API = {};
            GTMToolkit.debug(false).start();
            expect(GTMToolkit._getDebug()).toBe(false);
        });

        it('explicit .debug(true) works without Tag Assistant', function() {
            GTMToolkit.debug(true).start();
            expect(GTMToolkit._getDebug()).toBe(true);
        });
    });

    describe('._reset()', function() {
        it('resets all internal state', function() {
            GTMToolkit
                .toGADefault()
                .cookieExpiry(60)
                .debug(true)
                .onLinkClick('tel:', 'click_phone');
            GTMToolkit._reset();
            expect(GTMToolkit._getDefaultTransport()).toBe('dataLayer');
            expect(GTMToolkit._getCookieExpiry()).toBe(30);
            expect(GTMToolkit._getDebug()).toBe(false);
            expect(GTMToolkit._getRules().length).toBe(0);
        });
    });
});
