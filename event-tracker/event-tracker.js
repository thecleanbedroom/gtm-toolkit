/**
 * GTM Toolkit - Event Tracker
 * @version 1.0.0
 * @description Configurable event tracking for GA4/GTM via gtag.
 *              Tracks link clicks (tel, mailto, maps), CSS-based click
 *              events, and form submissions via DOM observation.
 * @license MIT
 * @repository https://github.com/thecleanbedroom/gtm-toolkit
 *
 * Usage (GTM Custom HTML tag):
 *
 *   <script src="https://cdn.jsdelivr.net/gh/thecleanbedroom/gtm-toolkit@1.0.0/event-tracker/event-tracker.js"></script>
 *   <script>
 *     new GTMToolkit.EventTracker({
 *       debug: false,
 *       linkPatterns: [
 *         { pattern: /^tel:/i, event: 'click_phone' },
 *         { pattern: /^mailto:/i, event: 'click_email' },
 *         { pattern: /(goo\.gl\/maps|google\.com\/maps|maps\.google\.com|maps\.app\.goo\.gl)/i, event: 'click_directions', newTab: true }
 *       ],
 *       clickPatterns: [
 *         { selector: '.chat-open-link', event: 'click_chat' }
 *       ],
 *       formPatterns: [
 *         { formSelector: '.frm-fluent-form', successSelector: '.ff-message-success', event: 'form_submit' }
 *       ]
 *     });
 *   </script>
 */
(function() {
    'use strict';

    var GTMToolkit = window.GTMToolkit || {};

    /**
     * EventTracker - Configurable event tracking via gtag.
     * @constructor
     * @param {Object} config
     * @param {boolean}  [config.debug=false]          - Enable verbose console logging.
     * @param {Array}    [config.linkPatterns=[]]       - URL-based patterns matched against href.
     * @param {Object}   config.linkPatterns[].pattern  - RegExp to match against link href.
     * @param {string}   config.linkPatterns[].event    - gtag event name to fire.
     * @param {boolean}  [config.linkPatterns[].newTab] - Force matched links to open in a new tab.
     * @param {Array}    [config.clickPatterns=[]]      - CSS selector-based click patterns.
     * @param {string}   config.clickPatterns[].selector - CSS selector to match clicked elements.
     * @param {string}   config.clickPatterns[].event    - gtag event name to fire.
     * @param {Array}    [config.formPatterns=[]]       - DOM observation-based form tracking.
     * @param {string}   config.formPatterns[].formSelector    - CSS selector for the form container.
     * @param {string}   config.formPatterns[].successSelector - CSS selector for the success element.
     * @param {string}   config.formPatterns[].event           - gtag event name to fire.
     */
    GTMToolkit.EventTracker = function(config) {
        var self = this;

        // ---------------------------------------------------------------
        // Config
        // ---------------------------------------------------------------
        self.version = '1.0.0';
        self.debug = config.debug || false;
        self.linkPatterns = config.linkPatterns || [];
        self.clickPatterns = config.clickPatterns || [];
        self.formPatterns = config.formPatterns || [];

        // ---------------------------------------------------------------
        // Logging
        // ---------------------------------------------------------------
        self.log = function() {
            if (self.debug) {
                console.log.apply(console, ['[GTMToolkit.EventTracker]'].concat(Array.prototype.slice.call(arguments)));
            }
        };

        self.error = function() {
            console.error.apply(console, ['[GTMToolkit.EventTracker]'].concat(Array.prototype.slice.call(arguments)));
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
            if (!href) return;

            for (var i = 0; i < self.linkPatterns.length; i++) {
                var p = self.linkPatterns[i];
                if (href.match(p.pattern)) {
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
                    self.send(p.event);
                    return;
                }
            }
        };

        // ---------------------------------------------------------------
        // Form tracking (MutationObserver-based)
        // ---------------------------------------------------------------
        self.observeForms = function() {
            if (!self.formPatterns.length) return;

            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType !== 1) return;

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
            self.observeForms();

            self.log('v' + self.version, 'initialized');
        };

        self.init();
    };

    window.GTMToolkit = GTMToolkit;
})();

