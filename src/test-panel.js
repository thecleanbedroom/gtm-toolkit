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
