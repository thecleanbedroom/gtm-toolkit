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
        /**
         * Sends an event to GTM via dataLayer.push.
         * @param {string} eventName - The event name.
         * @param {Object} [params={}] - Additional event parameters.
         * @returns {boolean} True if push succeeded.
         */
        self.send = function(eventName, params) {
            window.dataLayer = window.dataLayer || [];
            try {
                var payload = { event: eventName };
                var p = params || {};
                for (var key in p) {
                    if (p.hasOwnProperty(key)) {
                        payload[key] = p[key];
                    }
                }
                window.dataLayer.push(payload);
                self.log('Pushed:', eventName, params || {});
                return true;
            } catch (e) {
                self.error('Failed to push:', eventName, e);
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
