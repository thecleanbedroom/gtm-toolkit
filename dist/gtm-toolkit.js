/**
 * GTM Toolkit v1.1.0 - Bundle
 * Configurable event tracking and user qualification for GA4/GTM
 * Modules: _core, event-tracker, user-qualifier
 * Built: 2026-06-09T21:57:47.766Z
 * @license MIT
 * @repository https://github.com/thecleanbedroom/gtm-toolkit
 *
 * Auto-generated from source modules. Do not edit directly.
 */
/**
 * GTM Toolkit - Core
 * @description Namespace initialization, version, and shared utilities.
 *              Must load before all other modules (underscore prefix ensures
 *              alphabetical sort order in the build concatenation).
 * @license MIT
 * @repository https://github.com/thecleanbedroom/gtm-toolkit
 */
(function() {
    'use strict';

    var GTMToolkit = window.GTMToolkit || {};

    GTMToolkit.version = '1.1.0';
    GTMToolkit.debug = false;

    /**
     * Creates a prefixed logger. Debug output controlled by GTMToolkit.debug.
     * @param {string} prefix - Log prefix, e.g. '[GTMToolkit.EventTracker]'.
     * @returns {{ log: Function, error: Function }}
     */
    GTMToolkit.createLogger = function(prefix) {
        return {
            log: function() {
                if (GTMToolkit.debug) {
                    console.log.apply(console, [prefix].concat(Array.prototype.slice.call(arguments)));
                }
            },
            error: function() {
                console.error.apply(console, [prefix].concat(Array.prototype.slice.call(arguments)));
            }
        };
    };

    // Module registry - modules register themselves here
    GTMToolkit._modules = {};

    /**
     * Initialize the toolkit. Single entry point for all configuration.
     * @param {Object}  config
     * @param {boolean} [config.debug=false]          - Enable verbose console logging.
     * @param {Object}  [config.eventTracker]         - EventTracker module config.
     * @param {Object}  [config.userQualifier]        - UserQualifier module config.
     */
    GTMToolkit.init = function(config) {
        config = config || {};
        if (config.debug) { GTMToolkit.debug = true; }

        var logger = GTMToolkit.createLogger('[GTMToolkit]');

        if (config.eventTracker && GTMToolkit._modules.EventTracker) {
            GTMToolkit._modules.EventTracker(config.eventTracker);
            logger.log('EventTracker initialized');
        }

        if (config.userQualifier && GTMToolkit._modules.UserQualifier) {
            GTMToolkit._modules.UserQualifier(config.userQualifier);
            logger.log('UserQualifier initialized');
        }

        logger.log('v' + GTMToolkit.version, 'ready');
    };

    window.GTMToolkit = GTMToolkit;
})();

/**
 * GTM Toolkit - Event Tracker
 * @description Configurable event tracking for GA4/GTM via gtag.
 *              Tracks link clicks (tel, mailto, maps), CSS-based click
 *              events, and form submissions via DOM observation.
 *              Supports mobileOnly gating with optional UAParser integration.
 * @license MIT
 * @repository https://github.com/thecleanbedroom/gtm-toolkit
 */
(function() {
    'use strict';

    var GTMToolkit = window.GTMToolkit;
    var _eventTrackerBound = false;

    /**
     * EventTracker - Configurable event tracking via gtag.
     * @constructor
     * @param {Object}   [config]
     * @param {Function} [config.deviceDetector]        - Custom function returning 'mobile', 'tablet', or 'desktop'.
     * @param {Array}    [config.linkPatterns=[]]       - URL-based patterns matched against href.
     * @param {Object}   config.linkPatterns[].pattern  - RegExp to match against link href.
     * @param {string}   config.linkPatterns[].event    - gtag event name to fire.
     * @param {boolean}  [config.linkPatterns[].newTab] - Force matched links to open in a new tab.
     * @param {boolean}  [config.linkPatterns[].mobileOnly] - Only fire on mobile devices.
     * @param {Array}    [config.clickPatterns=[]]      - CSS selector-based click patterns.
     * @param {string}   config.clickPatterns[].selector - CSS selector to match clicked elements.
     * @param {string}   config.clickPatterns[].event    - gtag event name to fire.
     * @param {boolean}  [config.clickPatterns[].mobileOnly] - Only fire on mobile devices.
     * @param {Array}    [config.formPatterns=[]]       - DOM observation-based form tracking.
     * @param {string}   config.formPatterns[].formSelector    - CSS selector for the form container.
     * @param {string}   config.formPatterns[].successSelector - CSS selector for the success element.
     * @param {string}   config.formPatterns[].event           - gtag event name to fire.
     */
    GTMToolkit.EventTracker = function(config) {
        var self = this;
        config = config || {};

        self.linkPatterns = config.linkPatterns || [];
        self.clickPatterns = config.clickPatterns || [];
        self.formPatterns = config.formPatterns || [];
        self.deviceDetector = config.deviceDetector || null;

        // ---------------------------------------------------------------
        // Logging (via shared factory)
        // ---------------------------------------------------------------
        var logger = GTMToolkit.createLogger('[GTMToolkit.EventTracker]');
        self.log = logger.log;
        self.error = logger.error;

        // ---------------------------------------------------------------
        // Device detection
        // ---------------------------------------------------------------

        /**
         * Detects device type. Uses three-tier strategy:
         *   1. Custom deviceDetector function (if provided)
         *   2. UAParser (if loaded globally)
         *   3. Built-in lightweight regex + touch fallback
         * @returns {string} 'mobile', 'tablet', or 'desktop'
         */
        self.detectDevice = function() {
            // Tier 1: custom detector
            if (typeof self.deviceDetector === 'function') {
                return self.deviceDetector();
            }

            // Tier 2: UAParser (auto-detected if loaded)
            if (typeof window.UAParser === 'function') {
                var ua = (new window.UAParser()).getResult();
                if (ua && ua.device && ua.device.type) {
                    return ua.device.type; // 'mobile', 'tablet', etc.
                }
                return 'desktop';
            }

            // Tier 3: built-in lightweight check
            var agent = navigator.userAgent || '';
            if (/Mobi|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(agent)) {
                return 'mobile';
            }
            if (/iPad|Android(?!.*Mobile)|Tablet/i.test(agent) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(agent))) {
                return 'tablet';
            }
            return 'desktop';
        };

        self.isMobile = function() {
            return self.detectDevice() === 'mobile';
        };

        // ---------------------------------------------------------------
        // gtag interface
        // ---------------------------------------------------------------
        self.ensureGtag = function() {
            if (typeof window.gtag !== 'function') {
                self.log('gtag not yet available, creating dataLayer shim');
                window.dataLayer = window.dataLayer || [];
                window.gtag = function() {
                    window.dataLayer.push(arguments);
                };
            }
        };

        self.send = function(eventName, params) {
            self.ensureGtag();
            try {
                window.gtag('event', eventName, params || {});
                self.log('Sent:', eventName, params || {});
                return true;
            } catch (e) {
                self.error('Failed to send:', eventName, e);
                return false;
            }
        };

        // ---------------------------------------------------------------
        // Link tracking (URL pattern matching)
        // ---------------------------------------------------------------
        self.trackLink = function(link) {
            var href = link.href || '';
            if (!href) { return; }

            for (var i = 0; i < self.linkPatterns.length; i++) {
                var p = self.linkPatterns[i];
                if (href.match(p.pattern)) {
                    if (p.mobileOnly && !self.isMobile()) {
                        self.log('Skipped (not mobile):', p.event);
                        return;
                    }
                    self.send(p.event, { link_url: href });
                    if (p.newTab) {
                        link.setAttribute('target', '_blank');
                        link.setAttribute('rel', 'noopener noreferrer');
                    }
                    return;
                }
            }

            self.log('No link pattern match:', href);
        };

        // ---------------------------------------------------------------
        // Click tracking (CSS selector matching)
        // ---------------------------------------------------------------
        self.trackClick = function(element) {
            for (var i = 0; i < self.clickPatterns.length; i++) {
                var p = self.clickPatterns[i];
                if (element.closest(p.selector)) {
                    if (p.mobileOnly && !self.isMobile()) {
                        self.log('Skipped (not mobile):', p.event);
                        return;
                    }
                    self.send(p.event);
                    return;
                }
            }
        };

        // ---------------------------------------------------------------
        // Form tracking (MutationObserver-based)
        // ---------------------------------------------------------------
        self.trackForms = function() {
            if (!self.formPatterns.length) { return; }

            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType !== 1) { return; }

                        self.formPatterns.forEach(function(fp) {
                            var match = (node.matches && node.matches(fp.successSelector))
                                ? node
                                : (node.querySelector ? node.querySelector(fp.successSelector) : null);

                            if (match) {
                                var form = match.closest(fp.formSelector);
                                var formId = form
                                    ? (form.id || form.getAttribute('data-form_id') || 'unknown')
                                    : 'unknown';
                                self.log('Form success detected:', fp.formSelector, 'formId:', formId);
                                self.send(fp.event, { form_id: formId });
                            }
                        });
                    });
                });
            });

            observer.observe(document.body, { childList: true, subtree: true });
            self.log('Form observer active for', self.formPatterns.length, 'pattern(s)');
        };

        // ---------------------------------------------------------------
        // Initialization
        // ---------------------------------------------------------------
        self.init = function() {
            if (_eventTrackerBound) {
                self.log('EventTracker already initialized, skipping duplicate');
                return;
            }
            _eventTrackerBound = true;
            self.ensureGtag();

            // Link clicks
            if (self.linkPatterns.length) {
                document.addEventListener('click', function(e) {
                    var link = e.target.closest('a');
                    if (link) {
                        try {
                            self.trackLink(link);
                        } catch (err) {
                            self.error('Link tracking error:', err);
                        }
                    }
                });
                self.log('Link tracking bound for', self.linkPatterns.length, 'pattern(s)');
            }

            // CSS selector clicks
            if (self.clickPatterns.length) {
                document.addEventListener('click', function(e) {
                    try {
                        self.trackClick(e.target);
                    } catch (err) {
                        self.error('Click tracking error:', err);
                    }
                });
                self.log('Click tracking bound for', self.clickPatterns.length, 'pattern(s)');
            }

            // Form observation
            self.trackForms();

            self.log('initialized');
        };

        self.init();
    };

    // Register with core - init() will call this
    GTMToolkit._modules.EventTracker = function(config) {
        return new GTMToolkit.EventTracker(config);
    };

})();

/**
 * GTM Toolkit - User Qualifier
 * @description Cookie-based user qualification for GTM/GA4.
 *              Tracks page views, JavaScript support, Google Ads clicks (gclid),
 *              and user inclusion signals via dataLayer.
 * @license MIT
 * @repository https://github.com/thecleanbedroom/gtm-toolkit
 */
(function() {
    'use strict';

    var GTMToolkit = window.GTMToolkit;

    /**
     * UserQualifier - Cookie-based user qualification via dataLayer.
     * @constructor
     * @param {Object}  [config]
     * @param {number}  [config.cookieExpiry=30]     - Default cookie expiry in days.
     * @param {Object}  [config.keys]               - Cookie key overrides.
     * @param {string}  [config.keys.pageViews='ga_user_page_views']
     * @param {string}  [config.keys.hasJs='ga_user_has_js']
     * @param {string}  [config.keys.include='ga_user_include']
     * @param {string}  [config.keys.gclid='ga_user_from_ad']
     * @param {Object}  [config.checks]             - Toggle individual checks.
     * @param {boolean} [config.checks.hasJs=true]
     * @param {boolean} [config.checks.pageCount=true]
     * @param {boolean} [config.checks.include=true]
     * @param {boolean} [config.checks.gclid=true]
     */
    GTMToolkit.UserQualifier = function(config) {
        var self = this;
        config = config || {};

        self.cookieExpiry = config.cookieExpiry != null ? config.cookieExpiry : 30;

        var keys = config.keys || {};
        self.keys = {
            pageViews: keys.pageViews || 'ga_user_page_views',
            hasJs:     keys.hasJs     || 'ga_user_has_js',
            include:   keys.include   || 'ga_user_include',
            gclid:     keys.gclid     || 'ga_user_from_ad'
        };

        var checks = config.checks || {};
        self.checks = {
            hasJs:     checks.hasJs !== false,
            pageCount: checks.pageCount !== false,
            include:   checks.include !== false,
            gclid:     checks.gclid !== false
        };

        // ---------------------------------------------------------------
        // Logging (via shared factory)
        // ---------------------------------------------------------------
        var logger = GTMToolkit.createLogger('[GTMToolkit.UserQualifier]');
        self.log = logger.log;
        self.error = logger.error;

        // ---------------------------------------------------------------
        // Cookie helpers
        // ---------------------------------------------------------------
        self.getCookie = function(name) {
            var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
            return v ? v[2] : null;
        };

        self.setCookie = function(name, value, days) {
            var d = new Date();
            d.setTime(d.getTime() + 24 * 60 * 60 * 1000 * (days || self.cookieExpiry));
            document.cookie = name + '=' + value + ';path=/;expires=' + d.toGMTString() + ';SameSite=Lax;Secure';
        };

        self.removeCookie = function(name) {
            self.setCookie(name, '', -1);
        };

        self.hasCookie = function(name) {
            var val = self.getCookie(name);
            return val !== null && val !== '';
        };

        // ---------------------------------------------------------------
        // dataLayer interface
        // ---------------------------------------------------------------
        self.push = function(event) {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push(event);
            self.log('Pushed:', event);
        };

        // ---------------------------------------------------------------
        // Qualification checks
        // ---------------------------------------------------------------

        /**
         * Sets a cookie indicating JavaScript is enabled.
         * Persists for 365 days; only sets once.
         */
        self.setHasJs = function() {
            var key = self.keys.hasJs;
            if (self.hasCookie(key)) {
                self.log('JS cookie already set');
                return;
            }
            self.setCookie(key, 1, 365);
            self.log('JS cookie set');
        };

        /**
         * Increments the page view count cookie on each page load.
         */
        self.setPageCount = function() {
            var key = self.keys.pageViews;
            var count = self.hasCookie(key) ? parseInt(self.getCookie(key), 10) : 0;
            if (isNaN(count)) { count = 0; }
            count++;
            self.setCookie(key, count, self.cookieExpiry);
            self.log('Page count:', count);
        };

        /**
         * Pushes an inclusion event if the user has visited before
         * (page view cookie exists from a prior page load).
         */
        self.setInclude = function() {
            if (self.hasCookie(self.keys.pageViews)) {
                self.push({
                    'event': self.keys.include,
                    'value': 1
                });
                self.setCookie(self.keys.include, 1, 1);
                self.log('User included');
            }
        };

        /**
         * Detects gclid parameter in URL and persists via cookie.
         * Pushes a hasGclid event on subsequent page loads if previously detected.
         */
        self.setHasGclid = function() {
            var key = self.keys.gclid;

            if (self.hasCookie(key) && self.getCookie(key) === '1') {
                self.push({
                    'event': 'hasGclid',
                    'value': 1
                });
                self.log('Returning gclid user');
                return;
            }

            var match = window.location.href.match(/gclid=([^&]+)/);
            var hasGclid = match && match[1] ? 1 : 0;
            self.setCookie(key, hasGclid, self.cookieExpiry);
            self.log('Gclid detected:', !!hasGclid);
        };

        // ---------------------------------------------------------------
        // Initialization
        // ---------------------------------------------------------------
        self.init = function() {
            if (self.checks.hasJs)     { self.setHasJs(); }
            if (self.checks.pageCount) { self.setPageCount(); }
            if (self.checks.include)   { self.setInclude(); }
            if (self.checks.gclid)     { self.setHasGclid(); }

            self.log('initialized');
        };

        self.init();
    };

    // Register with core - init() will call this
    GTMToolkit._modules.UserQualifier = function(config) {
        return new GTMToolkit.UserQualifier(config);
    };

})();
