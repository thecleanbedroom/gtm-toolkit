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
