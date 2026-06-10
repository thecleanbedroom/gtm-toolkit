/**
 * Signals module tests
 */
'use strict';

// Load both modules so Jest instruments them
require('./core.js');
require('./signals.js');

var GTMToolkit;

// Cookie cleanup helper
function clearTestCookies() {
    ['ga_user_has_js', 'ga_user_page_views', 'ga_user_include', 'ga_user_from_ad'].forEach(function(name) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    });
}

beforeEach(function() {
    window.GTMToolkit._reset();
    window.dataLayer = [];
    window.gtag = undefined;
    clearTestCookies();
    GTMToolkit = window.GTMToolkit;
});

afterEach(function() {
    clearTestCookies();
});

describe('GTMToolkit Signals', function() {

    describe('hasJs cookie', function() {
        it('sets ga_user_has_js cookie on first run', function() {
            GTMToolkit._runSignals(30, 'dataLayer');
            expect(document.cookie).toContain('ga_user_has_js=1');
        });

        it('does not overwrite if already set', function() {
            document.cookie = 'ga_user_has_js=1;path=/';
            GTMToolkit._runSignals(30, 'dataLayer');
            expect(document.cookie).toContain('ga_user_has_js=1');
        });
    });

    describe('pageCount', function() {
        it('starts at 1 on first page view', function() {
            GTMToolkit._runSignals(30, 'dataLayer');
            expect(document.cookie).toContain('ga_user_page_views=1');
        });

        it('increments on subsequent page views', function() {
            document.cookie = 'ga_user_page_views=3;path=/';
            GTMToolkit._runSignals(30, 'dataLayer');
            expect(document.cookie).toContain('ga_user_page_views=4');
        });

        it('handles NaN cookie value gracefully', function() {
            document.cookie = 'ga_user_page_views=abc;path=/';
            GTMToolkit._runSignals(30, 'dataLayer');
            expect(document.cookie).toContain('ga_user_page_views=1');
        });
    });

    describe('include signal', function() {
        it('does not push on first page view', function() {
            GTMToolkit._runSignals(30, 'dataLayer');
            var includeEvents = window.dataLayer.filter(function(e) { return e.event === 'ga_user_include'; });
            expect(includeEvents.length).toBe(0);
        });

        it('pushes ga_user_include on returning visitor', function() {
            document.cookie = 'ga_user_page_views=1;path=/';
            GTMToolkit._runSignals(30, 'dataLayer');
            var includeEvents = window.dataLayer.filter(function(e) { return e.event === 'ga_user_include'; });
            expect(includeEvents.length).toBe(1);
            expect(includeEvents[0].value).toBe(1);
        });

        it('sets include cookie', function() {
            document.cookie = 'ga_user_page_views=1;path=/';
            GTMToolkit._runSignals(30, 'dataLayer');
            expect(document.cookie).toContain('ga_user_include=1');
        });
    });

    describe('gclid detection', function() {
        it('detects gclid from URL and sets cookie', function() {
            Object.defineProperty(window, 'location', {
                value: { search: '?gclid=abc123', href: 'https://example.com/?gclid=abc123' },
                writable: true,
                configurable: true
            });
            GTMToolkit._runSignals(30, 'dataLayer');
            expect(document.cookie).toContain('ga_user_from_ad=1');
            // Restore
            Object.defineProperty(window, 'location', {
                value: { search: '', href: 'https://example.com' },
                writable: true,
                configurable: true
            });
        });

        it('sets cookie to 0 when no gclid in URL', function() {
            GTMToolkit._runSignals(30, 'dataLayer');
            expect(document.cookie).toContain('ga_user_from_ad=0');
        });

        it('pushes hasGclid on return visit with gclid cookie', function() {
            document.cookie = 'ga_user_from_ad=1;path=/';
            GTMToolkit._runSignals(30, 'dataLayer');
            var gclidEvents = window.dataLayer.filter(function(e) { return e.event === 'hasGclid'; });
            expect(gclidEvents.length).toBe(1);
            expect(gclidEvents[0].value).toBe(1);
        });

        it('does not push hasGclid when cookie is 0', function() {
            document.cookie = 'ga_user_from_ad=0;path=/';
            GTMToolkit._runSignals(30, 'dataLayer');
            var gclidEvents = window.dataLayer.filter(function(e) { return e.event === 'hasGclid'; });
            expect(gclidEvents.length).toBe(0);
        });

        it('detects gclid with other URL parameters', function() {
            Object.defineProperty(window, 'location', {
                value: { search: '?utm_source=google&gclid=xyz789&utm_medium=cpc', href: 'https://example.com/?gclid=xyz789' },
                writable: true,
                configurable: true
            });
            GTMToolkit._runSignals(30, 'dataLayer');
            expect(document.cookie).toContain('ga_user_from_ad=1');
            Object.defineProperty(window, 'location', {
                value: { search: '', href: 'https://example.com' },
                writable: true,
                configurable: true
            });
        });
    });

    describe('cookie expiry', function() {
        it('uses provided cookie expiry for page count', function() {
            GTMToolkit._runSignals(60, 'dataLayer');
            expect(document.cookie).toContain('ga_user_page_views=1');
        });
    });

    describe('transport', function() {
        it('uses provided default transport for signal pushes (gtag)', function() {
            var gtagCalls = [];
            window.gtag = function() { gtagCalls.push(Array.prototype.slice.call(arguments)); };
            document.cookie = 'ga_user_page_views=1;path=/';
            GTMToolkit._runSignals(30, 'gtag');
            var includeEvents = gtagCalls.filter(function(c) { return c[1] === 'ga_user_include'; });
            expect(includeEvents.length).toBe(1);
        });
    });

    describe('cookie helpers', function() {
        it('setCookie and getCookie round-trip', function() {
            GTMToolkit._runSignals(30, 'dataLayer');
            expect(document.cookie).toContain('ga_user_has_js=1');
            expect(document.cookie).toContain('ga_user_page_views=1');
        });

        it('cookieExpiry of 0 is respected (does not throw)', function() {
            expect(function() {
                GTMToolkit._runSignals(0, 'dataLayer');
            }).not.toThrow();
        });
    });
});
