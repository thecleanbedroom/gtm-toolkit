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

        // Auto-enable debug when Google Tag Assistant previewer is active
        if (!GTMToolkit.debug && window.location.search.indexOf('gtm_debug') !== -1) {
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

        if (config.eventTracker && GTMToolkit._modules.EventTracker) {
            GTMToolkit._modules.EventTracker(config.eventTracker);
            logger.log('EventTracker initialized');
        }

        if (config.userQualifier && GTMToolkit._modules.UserQualifier) {
            GTMToolkit._modules.UserQualifier(config.userQualifier);
            logger.log('UserQualifier initialized');
        }

        logger.log('Registered events:', events.join(', '));
        logger.log('v' + GTMToolkit.version, 'ready');
    };

    window.GTMToolkit = GTMToolkit;
})();
