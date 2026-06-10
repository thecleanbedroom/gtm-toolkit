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
