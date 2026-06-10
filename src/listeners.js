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
