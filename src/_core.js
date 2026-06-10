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

    GTMToolkit.version = '1.3.0';
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

    /**
     * Ensures window.gtag exists. Creates a dataLayer shim if gtag.js
     * hasn't loaded yet - queued events are processed once it does.
     */
    GTMToolkit._ensureTransport = function() {
        if (typeof window.gtag !== 'function') {
            window.dataLayer = window.dataLayer || [];
            window.gtag = function() {
                window.dataLayer.push(arguments);
            };
        }
    };

    /**
     * Central event transport. All modules use this to push events.
     * Currently sends via gtag() which goes directly to GA4.
     * @param {string} eventName - The event name.
     * @param {Object} [params={}] - Additional event parameters.
     * @returns {boolean} True if push succeeded.
     */
    GTMToolkit.push = function(eventName, params, source) {
        GTMToolkit._ensureTransport();
        try {
            window.gtag('event', eventName, params || {});
            if (source) {
                var successLogger = GTMToolkit.createLogger(source);
                successLogger.log('Push:', eventName, params || {});
            }
            return true;
        } catch (e) {
            var errorLogger = GTMToolkit.createLogger(source || '[GTMToolkit]');
            errorLogger.error('Failed to push:', eventName, e);
            return false;
        }
    };



    /**
     * Initialize the toolkit. Single entry point for all configuration.
     * @param {Object}  config
     * @param {boolean} [config.debug=false]          - Enable verbose console logging.
     * @param {Object}  [config.eventTracker]         - EventTracker module config.
     * @param {Object}  [config.userQualifier]        - UserQualifier module config.
     */
    GTMToolkit.init = function(config) {
        config = config || {};

        if (GTMToolkit._initialized) {
            console.warn('[GTMToolkit] init() called again, ignoring. Toolkit already initialized.');
            return;
        }
        GTMToolkit._initialized = true;

        if (config.debug) { GTMToolkit.debug = true; }

        // Auto-enable debug when Tag Assistant or gtm_debug is detected
        var isTagAssistant = !!window.__TAG_ASSISTANT_API ||
            window.location.search.indexOf('gtm_debug') !== -1 ||
            document.cookie.indexOf('gtm_debug') !== -1;
        if (!GTMToolkit.debug && isTagAssistant) {
            GTMToolkit.debug = true;
        }

        var logger = GTMToolkit.createLogger('[GTMToolkit]');

        // Collect registered event names from config for GTM trigger matching
        var events = [];
        if (config.eventTracker) {
            var et = config.eventTracker;
            (et.linkPatterns || []).forEach(function(p) { events.push(p.event); });
            (et.clickPatterns || []).forEach(function(p) { events.push(p.event); });
            (et.formPatterns || []).forEach(function(p) { events.push(p.event); });
        }
        if (config.userQualifier) {
            var checks = config.userQualifier.checks || {};
            if (checks.include !== false) { events.push('ga_user_include'); }
            if (checks.gclid !== false) { events.push('hasGclid'); }
        }
        GTMToolkit.registeredEvents = events;

        if (config.eventTracker && GTMToolkit.EventTracker) {
            new GTMToolkit.EventTracker(config.eventTracker);
            logger.log('EventTracker initialized');
        }

        if (config.userQualifier && GTMToolkit.UserQualifier) {
            new GTMToolkit.UserQualifier(config.userQualifier);
            logger.log('UserQualifier initialized');
        }

        logger.log('Registered events:', events.join(', '));
        logger.log('v' + GTMToolkit.version, 'ready');

        // Render test panel when Tag Assistant is active
        if (GTMToolkit.debug && isTagAssistant) {
            _renderTestPanel(config);
        }
    };

    /**
     * Renders a floating test panel with clickable elements matching the
     * user's configured patterns. Only shown during Tag Assistant preview.
     * @private
     */
    function _renderTestPanel(config) {
        var et = config.eventTracker || {};
        var links = [];
        var btnStyle = 'color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;border:none;cursor:pointer;display:inline-block;';

        // Generate sample links from linkPatterns
        (et.linkPatterns || []).forEach(function(p) {
            var src = p.pattern.source || '';
            var href = 'https://example.com/test';
            var icon = '🔗';
            if (/tel/i.test(src)) { href = 'tel:+15551234567'; icon = '📞'; }
            else if (/mailto/i.test(src)) { href = 'mailto:test@example.com'; icon = '📧'; }
            else if (/maps/i.test(src)) { href = 'https://maps.google.com/maps?q=test'; icon = '📍'; }
            var a = document.createElement('a');
            a.href = href;
            a.setAttribute('style', btnStyle + 'background:#2ecc71;');
            a.textContent = icon + ' ' + p.event + (p.mobileOnly ? ' (mobile)' : '');
            links.push(a);
        });

        // Generate buttons from clickPatterns
        (et.clickPatterns || []).forEach(function(p) {
            var btn = document.createElement('button');
            // Strip CSS selector prefixes (., #) to get a usable class name
            btn.className = p.selector.replace(/^[.#]/, '');
            btn.setAttribute('style', btnStyle + 'background:#9b59b6;');
            btn.textContent = '💬 ' + p.event;
            links.push(btn);
        });

        // Generate form simulation buttons from formPatterns
        (et.formPatterns || []).forEach(function(p) {
            var btn = document.createElement('button');
            btn.textContent = '📋 ' + p.event + ' (simulate)';
            btn.setAttribute('style', btnStyle + 'background:#e67e22;');
            btn.addEventListener('click', function() {
                var form = document.querySelector(p.formSelector);
                if (form) {
                    var el = document.createElement('div');
                    el.className = p.successSelector.replace(/^\./, '');
                    el.textContent = 'Test success';
                    form.appendChild(el);
                } else {
                    console.warn('[GTMToolkit Test] Form not found:', p.formSelector);
                }
            });
            links.push(btn);
        });

        var panel = document.createElement('div');
        panel.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#1a1a2e;padding:12px 20px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;box-shadow:0 -2px 10px rgba(0,0,0,0.3);';

        var label = document.createElement('span');
        label.textContent = 'GTM Toolkit v' + GTMToolkit.version + ' Test Panel';
        label.style.cssText = 'color:#888;font-size:11px;margin-right:10px;';
        panel.appendChild(label);

        links.forEach(function(item) {
            panel.appendChild(item);
        });

        document.body.appendChild(panel);
    }

    window.GTMToolkit = GTMToolkit;
})();
