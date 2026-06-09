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
