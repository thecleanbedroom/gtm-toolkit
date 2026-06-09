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
