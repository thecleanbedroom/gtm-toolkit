/**
 * GTM Toolkit v2.0.0 - Bundle
 * Configurable event tracking and user qualification for GA4/GTM
 * Modules: core, listeners, signals, test-panel
 * Built: 2026-06-10T17:18:15.835Z
 * @license MIT
 * @repository https://github.com/thecleanbedroom/gtm-toolkit
 *
 * Auto-generated from source modules. Do not edit directly.
 */
/**
 * GTM Toolkit - Core
 * @description Fluent builder API, transport abstraction, and orchestration.
 *              Must load before all other modules.
 * @license MIT
 * @repository https://github.com/thecleanbedroom/gtm-toolkit
 */
(function() {
    'use strict';

    var GTMToolkit = window.GTMToolkit || {};

    GTMToolkit.version = '2.0.0';

    // -------------------------------------------------------------------
    // Private state (not accessible outside this IIFE)
    // -------------------------------------------------------------------
    var _defaultTransport = 'dataLayer';
    var _cookieExpiry = 30;
    var _debug = false;
    var _debugExplicit = false;   // true if .debug() was called explicitly
    var _rules = [];
    var _lastRule = null;
    var _started = false;
    var _cleanupFn = null;        // returned by _bindListeners for teardown

    // -------------------------------------------------------------------
    // Logger factory
    // -------------------------------------------------------------------

    /**
     * Creates a prefixed logger. Output controlled by debug state.
     * @param {string} prefix - Log prefix, e.g. '[GTMToolkit]'.
     * @returns {{ log: Function, error: Function }}
     */
    GTMToolkit.createLogger = function(prefix) {
        return {
            log: function() {
                if (_debug) {
                    console.log.apply(console, [prefix].concat(Array.prototype.slice.call(arguments)));
                }
            },
            error: function() {
                console.error.apply(console, [prefix].concat(Array.prototype.slice.call(arguments)));
            }
        };
    };

    // -------------------------------------------------------------------
    // Transport
    // -------------------------------------------------------------------

    function _ensureDataLayer() {
        window.dataLayer = window.dataLayer || [];
    }

    function _ensureGtag() {
        _ensureDataLayer();
        if (typeof window.gtag !== 'function') {
            window.gtag = function() {
                window.dataLayer.push(arguments);
            };
        }
    }

    /**
     * Central event transport. Pushes via dataLayer or gtag.
     * @param {string} eventName - The event name.
     * @param {Object} [params={}] - Additional event parameters.
     * @param {string} [transport] - Override transport ('dataLayer' or 'gtag').
     *                               Falls back to _defaultTransport.
     * @returns {boolean} True if push succeeded.
     */
    GTMToolkit.push = function(eventName, params, transport) {
        var resolvedTransport = transport || _defaultTransport;
        params = params || {};

        try {
            if (resolvedTransport === 'gtag') {
                _ensureGtag();
                window.gtag('event', eventName, params);
            } else {
                _ensureDataLayer();
                var payload = { event: eventName };
                for (var k in params) {
                    if (params.hasOwnProperty(k)) {
                        payload[k] = params[k];
                    }
                }
                window.dataLayer.push(payload);
            }

            if (_debug) {
                var logger = GTMToolkit.createLogger('[GTMToolkit]');
                logger.log('Push (' + resolvedTransport + '):', eventName, params);
            }

            return true;
        } catch (e) {
            var errorLogger = GTMToolkit.createLogger('[GTMToolkit]');
            errorLogger.error('Failed to push:', eventName, e);
            return false;
        }
    };

    // -------------------------------------------------------------------
    // Fluent API - Global configuration
    // -------------------------------------------------------------------

    /**
     * Set default transport to GTM (dataLayer.push).
     * @returns {Object} GTMToolkit for chaining.
     */
    GTMToolkit.toGTMDefault = function() {
        _defaultTransport = 'dataLayer';
        return GTMToolkit;
    };

    /**
     * Set default transport to GA (gtag).
     * @returns {Object} GTMToolkit for chaining.
     */
    GTMToolkit.toGADefault = function() {
        _defaultTransport = 'gtag';
        return GTMToolkit;
    };

    /**
     * Set cookie expiry in days for signals.
     * @param {number} days - Cookie expiry in days.
     * @returns {Object} GTMToolkit for chaining.
     */
    GTMToolkit.cookieExpiry = function(days) {
        _cookieExpiry = days;
        return GTMToolkit;
    };

    /**
     * Explicitly enable or disable debug mode.
     * @param {boolean} val - true to enable, false to disable.
     * @returns {Object} GTMToolkit for chaining.
     */
    GTMToolkit.debug = function(val) {
        _debug = !!val;
        _debugExplicit = true;
        return GTMToolkit;
    };

    // -------------------------------------------------------------------
    // Fluent API - Rule registration
    // -------------------------------------------------------------------

    function _addRule(type, config) {
        var rule = { type: type, transport: null, mobileOnly: false, newTab: false };
        for (var k in config) {
            if (config.hasOwnProperty(k)) {
                rule[k] = config[k];
            }
        }
        _rules.push(rule);
        _lastRule = rule;
        return GTMToolkit;
    }

    /**
     * Register a link click event. Fires when a clicked <a> href matches.
     * @param {string|Array|RegExp} match - String (indexOf), array of strings, or RegExp.
     * @param {string} event - Event name to push.
     * @returns {Object} GTMToolkit for chaining.
     */
    GTMToolkit.onLinkClick = function(match, event) {
        return _addRule('link', { match: match, event: event });
    };

    /**
     * Register a selector click event. Fires when a clicked element matches the CSS selector.
     * @param {string} selector - CSS selector.
     * @param {string} event - Event name to push.
     * @returns {Object} GTMToolkit for chaining.
     */
    GTMToolkit.onSelectorClick = function(selector, event) {
        return _addRule('selector', { selector: selector, event: event });
    };

    /**
     * Register a form submit event. Fires when a success element appears inside the form.
     * @param {string} formSelector - CSS selector for the form container.
     * @param {string} successSelector - CSS selector for the success element.
     * @param {string} event - Event name to push.
     * @returns {Object} GTMToolkit for chaining.
     */
    GTMToolkit.onFormSubmit = function(formSelector, successSelector, event) {
        return _addRule('form', {
            formSelector: formSelector,
            successSelector: successSelector,
            event: event
        });
    };

    // -------------------------------------------------------------------
    // Fluent API - Per-rule modifiers (operate on _lastRule)
    // -------------------------------------------------------------------

    /**
     * Restrict the last registered rule to mobile devices only.
     * @returns {Object} GTMToolkit for chaining.
     */
    GTMToolkit.onlyMobile = function() {
        if (_lastRule) { _lastRule.mobileOnly = true; }
        return GTMToolkit;
    };

    /**
     * Force matched links to open in a new tab.
     * @returns {Object} GTMToolkit for chaining.
     */
    GTMToolkit.newTab = function() {
        if (_lastRule) { _lastRule.newTab = true; }
        return GTMToolkit;
    };

    /**
     * Override transport for the last registered rule to GA (gtag).
     * @returns {Object} GTMToolkit for chaining.
     */
    GTMToolkit.toGA = function() {
        if (_lastRule) { _lastRule.transport = 'gtag'; }
        return GTMToolkit;
    };

    /**
     * Override transport for the last registered rule to GTM (dataLayer).
     * @returns {Object} GTMToolkit for chaining.
     */
    GTMToolkit.toGTM = function() {
        if (_lastRule) { _lastRule.transport = 'dataLayer'; }
        return GTMToolkit;
    };

    // -------------------------------------------------------------------
    // Start
    // -------------------------------------------------------------------

    /**
     * Initialize the toolkit. Binds listeners, runs signals, renders test panel.
     * Idempotent - calling again is a no-op with a warning.
     */
    GTMToolkit.start = function() {
        if (_started) {
            console.warn('[GTMToolkit] start() called again, ignoring.');
            return;
        }
        _started = true;

        // Auto-detect debug if not explicitly set
        if (!_debugExplicit) {
            var isTagAssistant = !!window.__TAG_ASSISTANT_API;
            var hasDebugParam = window.location.search.indexOf('gtm_debug') !== -1;
            var hasDebugCookie = /(?:^|;\s*)gtm_debug=/.test(document.cookie);

            if (isTagAssistant || hasDebugParam || hasDebugCookie) {
                _debug = true;
            }
        }

        var logger = GTMToolkit.createLogger('[GTMToolkit]');

        // Bind DOM listeners (from listeners.js)
        if (typeof GTMToolkit._bindListeners === 'function') {
            _cleanupFn = GTMToolkit._bindListeners(_rules, _defaultTransport) || null;
        }

        // Run user signals (from signals.js)
        if (typeof GTMToolkit._runSignals === 'function') {
            GTMToolkit._runSignals(_cookieExpiry, _defaultTransport);
        }

        // Render test panel when Tag Assistant is active (from test-panel.js)
        if (_debug && !!window.__TAG_ASSISTANT_API && typeof GTMToolkit._renderTestPanel === 'function') {
            GTMToolkit._renderTestPanel(_rules);
        }

        // Collect event names for reference
        var events = _rules.map(function(r) { return r.event; });
        GTMToolkit.registeredEvents = events;

        logger.log('v' + GTMToolkit.version, 'ready');
        logger.log('Rules:', _rules.length, '| Transport:', _defaultTransport);
        if (events.length) {
            logger.log('Events:', events.join(', '));
        }
    };

    // -------------------------------------------------------------------
    // Internal getters (for other modules, not public API)
    // -------------------------------------------------------------------
    GTMToolkit._getDebug = function() { return _debug; };
    GTMToolkit._getCookieExpiry = function() { return _cookieExpiry; };
    GTMToolkit._getDefaultTransport = function() { return _defaultTransport; };
    GTMToolkit._getRules = function() { return _rules; };

    // -------------------------------------------------------------------
    // Reset (for testing only)
    // -------------------------------------------------------------------
    GTMToolkit._reset = function() {
        if (_cleanupFn) { _cleanupFn(); _cleanupFn = null; }
        _defaultTransport = 'dataLayer';
        _cookieExpiry = 30;
        _debug = false;
        _debugExplicit = false;
        _rules = [];
        _lastRule = null;
        _started = false;
        GTMToolkit.registeredEvents = [];
    };

    window.GTMToolkit = GTMToolkit;
})();

/**
 * GTM Toolkit - Listeners
 * @description DOM event binding for link clicks, selector clicks, and form submissions.
 *              Called by core.js during .start().
 * @license MIT
 * @repository https://github.com/thecleanbedroom/gtm-toolkit
 */
(function() {
    'use strict';

    var GTMToolkit = window.GTMToolkit;

    // -------------------------------------------------------------------
    // Device detection (private)
    // -------------------------------------------------------------------

    /**
     * Detects device type using a three-tier strategy:
     *   1. UAParser (if loaded globally)
     *   2. Built-in lightweight regex + touch fallback
     * @returns {string} 'mobile', 'tablet', or 'desktop'
     */
    function detectDevice() {
        // Tier 1: UAParser (auto-detected if loaded)
        if (typeof window.UAParser === 'function') {
            var ua = (new window.UAParser()).getResult();
            if (ua && ua.device && ua.device.type) {
                return ua.device.type;
            }
            return 'desktop';
        }

        // Tier 2: built-in lightweight check
        var agent = navigator.userAgent || '';
        if (/Mobi|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(agent)) {
            return 'mobile';
        }
        if (/iPad|Android(?!.*Mobile)|Tablet/i.test(agent) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(agent))) {
            return 'tablet';
        }
        return 'desktop';
    }

    function isMobile() {
        return detectDevice() === 'mobile';
    }

    // -------------------------------------------------------------------
    // Link matching (private)
    // -------------------------------------------------------------------

    /**
     * Tests whether a URL matches a link rule's match pattern.
     * Supports string (indexOf), array of strings (some(indexOf)), or RegExp (.test()).
     * @param {string} href - The link URL to test.
     * @param {string|Array|RegExp} match - The match pattern.
     * @returns {boolean}
     */
    function matchesLink(href, match) {
        if (match instanceof RegExp) {
            return match.test(href);
        }
        if (Array.isArray(match)) {
            for (var i = 0; i < match.length; i++) {
                if (href.indexOf(match[i]) !== -1) {
                    return true;
                }
            }
            return false;
        }
        // String match
        return href.indexOf(match) !== -1;
    }

    // -------------------------------------------------------------------
    // Bind listeners (called from core.js .start())
    // -------------------------------------------------------------------

    /**
     * Binds DOM event listeners based on registered rules.
     * @param {Array} rules - Array of rule objects from the builder.
     * @param {string} defaultTransport - Default transport ('dataLayer' or 'gtag').
     * @returns {Function} Cleanup function that removes all bound listeners.
     */
    GTMToolkit._bindListeners = function(rules, defaultTransport) {
        var logger = GTMToolkit.createLogger('[GTMToolkit]');
        var _clickHandler = null;
        var _observer = null;

        var linkRules = [];
        var selectorRules = [];
        var formRules = [];

        // Partition rules by type
        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            if (r.type === 'link') { linkRules.push(r); }
            else if (r.type === 'selector') { selectorRules.push(r); }
            else if (r.type === 'form') { formRules.push(r); }
        }

        // Single delegated click handler for links + selectors
        if (linkRules.length || selectorRules.length) {
            _clickHandler = function(e) {
                try {
                    // Link matching
                    var link = e.target.closest('a');
                    if (link && linkRules.length) {
                        var href = link.href || '';
                        if (href) {
                            for (var li = 0; li < linkRules.length; li++) {
                                var lr = linkRules[li];
                                if (matchesLink(href, lr.match)) {
                                    if (lr.mobileOnly && !isMobile()) {
                                        logger.log('Skipped (not mobile):', lr.event);
                                        return;
                                    }
                                    var linkTransport = lr.transport || defaultTransport;
                                    GTMToolkit.push(lr.event, { link_url: href }, linkTransport);
                                    if (lr.newTab) {
                                        link.setAttribute('target', '_blank');
                                        link.setAttribute('rel', 'noopener noreferrer');
                                    }
                                    return;
                                }
                            }
                        }
                    }

                    // Selector matching
                    for (var si = 0; si < selectorRules.length; si++) {
                        var sr = selectorRules[si];
                        if (e.target.closest(sr.selector)) {
                            if (sr.mobileOnly && !isMobile()) {
                                logger.log('Skipped (not mobile):', sr.event);
                                return;
                            }
                            var selectorTransport = sr.transport || defaultTransport;
                            GTMToolkit.push(sr.event, {}, selectorTransport);
                            return;
                        }
                    }
                } catch (err) {
                    logger.error('Listener error:', err);
                }
            };

            document.addEventListener('click', _clickHandler);

            logger.log('Click tracking bound for',
                linkRules.length, 'link +',
                selectorRules.length, 'selector rule(s)');
        }

        // Form observation (MutationObserver)
        if (formRules.length) {
            _observer = new MutationObserver(function(mutations) {
                for (var mi = 0; mi < mutations.length; mi++) {
                    var mutation = mutations[mi];
                    for (var ni = 0; ni < mutation.addedNodes.length; ni++) {
                        var node = mutation.addedNodes[ni];
                        if (node.nodeType !== 1) { continue; }

                        try {
                            for (var fi = 0; fi < formRules.length; fi++) {
                                var fp = formRules[fi];
                                var match = (node.matches && node.matches(fp.successSelector))
                                    ? node
                                    : (node.querySelector ? node.querySelector(fp.successSelector) : null);

                                if (match) {
                                    var form = match.closest(fp.formSelector);
                                    var formId = form
                                        ? (form.id || form.getAttribute('data-form_id') || 'unknown')
                                        : 'unknown';
                                    var formTransport = fp.transport || defaultTransport;
                                    logger.log('Form success detected:', fp.formSelector, 'formId:', formId);
                                    GTMToolkit.push(fp.event, { form_id: formId }, formTransport);
                                }
                            }
                        } catch (err) {
                            logger.error('Form tracking error:', err);
                        }
                    }
                }
            });

            _observer.observe(document.body, { childList: true, subtree: true });
            logger.log('Form observer active for', formRules.length, 'rule(s)');
        }

        // Return cleanup function for test teardown
        return function() {
            if (_clickHandler) {
                document.removeEventListener('click', _clickHandler);
                _clickHandler = null;
            }
            if (_observer) {
                _observer.disconnect();
                _observer = null;
            }
        };
    };

})();

/**
 * GTM Toolkit - Signals
 * @description Cookie-based user signals for GTM/GA4.
 *              Pushes user context events (hasJs, pageCount, include, gclid).
 *              Runs automatically on .start().
 * @license MIT
 * @repository https://github.com/thecleanbedroom/gtm-toolkit
 */
(function() {
    'use strict';

    var GTMToolkit = window.GTMToolkit;

    // -------------------------------------------------------------------
    // Cookie helpers (private - not on namespace)
    // -------------------------------------------------------------------

    /**
     * Get a cookie value by name.
     * @param {string} name - Cookie name (will be regex-escaped).
     * @returns {string|null} Cookie value or null.
     */
    function getCookie(name) {
        var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var v = document.cookie.match('(^|;) ?' + escaped + '=([^;]*)(;|$)');
        return v ? v[2] : null;
    }

    /**
     * Set a cookie with security attributes.
     * @param {string} name - Cookie name.
     * @param {*} value - Cookie value.
     * @param {number} days - Expiry in days.
     */
    function setCookie(name, value, days) {
        var d = new Date();
        d.setTime(d.getTime() + 24 * 60 * 60 * 1000 * days);
        document.cookie = name + '=' + value + ';path=/;expires=' + d.toGMTString() + ';SameSite=Lax;Secure';
    }

    /**
     * Check if a cookie exists and has a non-empty value.
     * @param {string} name - Cookie name.
     * @returns {boolean}
     */
    function hasCookie(name) {
        var val = getCookie(name);
        return val !== null && val !== '';
    }

    // -------------------------------------------------------------------
    // Cookie key constants
    // -------------------------------------------------------------------
    var KEYS = {
        pageViews: 'ga_user_page_views',
        hasJs:     'ga_user_has_js',
        include:   'ga_user_include',
        gclid:     'ga_user_from_ad'
    };

    // -------------------------------------------------------------------
    // Run signals (called from core.js .start())
    // -------------------------------------------------------------------

    /**
     * Pushes user context signals based on cookie state.
     * @param {number} cookieExpiry - Cookie expiry in days.
     * @param {string} defaultTransport - Default transport for pushes.
     */
    GTMToolkit._runSignals = function(cookieExpiry, defaultTransport) {
        var logger = GTMToolkit.createLogger('[GTMToolkit.Signals]');

        // 1. hasJs - set once, never overwritten (365 days)
        if (!hasCookie(KEYS.hasJs)) {
            setCookie(KEYS.hasJs, 1, 365);
            logger.log('JS cookie set');
        }

        // 2. pageCount - increment on every page load
        var count = parseInt(getCookie(KEYS.pageViews) || '0', 10);
        if (isNaN(count)) { count = 0; }
        count++;
        setCookie(KEYS.pageViews, count, cookieExpiry);
        logger.log('Page count:', count);

        // 3. include - push signal if returning visitor (visited before this page load)
        if (count > 1) {
            GTMToolkit.push(KEYS.include, { value: 1 }, defaultTransport);
            setCookie(KEYS.include, 1, 1);
            logger.log('User included (page', count + ')');
        }

        // 4. gclid - detect from URL, persist, push signal on return
        if (hasCookie(KEYS.gclid) && getCookie(KEYS.gclid) === '1') {
            GTMToolkit.push('hasGclid', { value: 1 }, defaultTransport);
            logger.log('Returning gclid user');
        } else {
            var match = window.location.search.match(/[?&]gclid=([^&]+)/);
            var hasGclid = match && match[1] ? 1 : 0;
            setCookie(KEYS.gclid, hasGclid, cookieExpiry);
            if (hasGclid) {
                logger.log('Gclid detected from URL');
            }
        }

        logger.log('Signals complete');
    };

})();

/**
 * GTM Toolkit - Test Panel
 * @description Floating debug panel with clickable elements for each registered rule.
 *              Only rendered when Tag Assistant (__TAG_ASSISTANT_API) is active.
 * @license MIT
 * @repository https://github.com/thecleanbedroom/gtm-toolkit
 */
(function() {
    'use strict';

    var GTMToolkit = window.GTMToolkit;

    var BTN_STYLE = 'color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;' +
        'font-weight:bold;font-size:13px;border:none;cursor:pointer;display:inline-block;';

    /**
     * Infer a sample href from a link match pattern for the test panel.
     * @param {string|Array|RegExp} match - The link match pattern.
     * @returns {{ href: string, icon: string }}
     */
    function inferLinkSample(match) {
        var sample = { href: 'https://example.com/test', icon: '\uD83D\uDD17' };
        var source = '';

        if (match instanceof RegExp) {
            source = match.source || '';
        } else if (Array.isArray(match)) {
            source = match.join(' ');
        } else {
            source = match;
        }

        if (/tel/i.test(source)) {
            sample.href = 'tel:+15551234567';
            sample.icon = '\uD83D\uDCDE';
        } else if (/mailto/i.test(source)) {
            sample.href = 'mailto:test@example.com';
            sample.icon = '\uD83D\uDCE7';
        } else if (/maps/i.test(source)) {
            sample.href = 'https://maps.google.com/maps?q=test';
            sample.icon = '\uD83D\uDCCD';
        }

        return sample;
    }

    /**
     * Renders a floating test panel with clickable elements matching registered rules.
     * @param {Array} rules - Array of rule objects from the builder.
     */
    GTMToolkit._renderTestPanel = function(rules) {
        var elements = [];

        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];

            if (rule.type === 'link') {
                var sample = inferLinkSample(rule.match);
                var a = document.createElement('a');
                a.href = sample.href;
                a.setAttribute('style', BTN_STYLE + 'background:#2ecc71;');
                a.textContent = sample.icon + ' ' + rule.event + (rule.mobileOnly ? ' (mobile)' : '');
                elements.push(a);
            }

            if (rule.type === 'selector') {
                var btn = document.createElement('button');
                var className = rule.selector.replace(/^[.#]/, '');
                btn.className = className;
                btn.setAttribute('style', BTN_STYLE + 'background:#9b59b6;');
                btn.textContent = '\uD83D\uDCAC ' + rule.event;
                elements.push(btn);
            }

            if (rule.type === 'form') {
                var formBtn = document.createElement('button');
                formBtn.textContent = '\uD83D\uDCCB ' + rule.event + ' (simulate)';
                formBtn.setAttribute('style', BTN_STYLE + 'background:#e67e22;');
                formBtn.addEventListener('click', (function(fp) {
                    return function() {
                        var form = document.querySelector(fp.formSelector);
                        if (form) {
                            var el = document.createElement('div');
                            el.className = fp.successSelector.replace(/^\./, '');
                            el.textContent = 'Test success';
                            form.appendChild(el);
                        } else {
                            console.warn('[GTMToolkit Test] Form not found:', fp.formSelector);
                        }
                    };
                })(rule));
                elements.push(formBtn);
            }
        }

        var panel = document.createElement('div');
        panel.setAttribute('data-gtm-test-panel', 'true');
        panel.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:2147483647;' +
            'background:#1a1a2e;padding:12px 20px;display:flex;flex-wrap:wrap;gap:10px;' +
            'align-items:center;box-shadow:0 -2px 10px rgba(0,0,0,0.3);';

        var label = document.createElement('span');
        label.textContent = 'GTM Toolkit v' + GTMToolkit.version + ' Test Panel';
        label.style.cssText = 'color:#888;font-size:11px;margin-right:10px;';
        panel.appendChild(label);

        for (var j = 0; j < elements.length; j++) {
            panel.appendChild(elements[j]);
        }

        document.body.appendChild(panel);
    };

})();
