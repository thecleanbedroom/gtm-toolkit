/**
 * Test Panel module tests
 */
'use strict';

// Load both modules so Jest instruments them
require('./core.js');
require('./test-panel.js');

var GTMToolkit;
var PANEL_SELECTOR = '[data-gtm-test-panel]';

beforeEach(function() {
    window.GTMToolkit._reset();
    window.dataLayer = [];
    window.gtag = undefined;
    delete window.__TAG_ASSISTANT_API;
    GTMToolkit = window.GTMToolkit;

    // Clean up any previously added test panels
    document.querySelectorAll(PANEL_SELECTOR).forEach(function(p) { p.remove(); });
});

afterEach(function() {
    document.querySelectorAll(PANEL_SELECTOR).forEach(function(p) { p.remove(); });
});

function getPanel() {
    var panels = document.querySelectorAll(PANEL_SELECTOR);
    return panels[panels.length - 1];
}

describe('GTMToolkit Test Panel', function() {

    it('renders panel to document.body', function() {
        var rules = [
            { type: 'link', match: 'tel:', event: 'click_phone', mobileOnly: false, newTab: false }
        ];
        GTMToolkit._renderTestPanel(rules);
        expect(getPanel()).not.toBeUndefined();
    });

    it('includes version in label', function() {
        GTMToolkit._renderTestPanel([]);
        var panel = getPanel();
        expect(panel.textContent).toContain('v2.0.0');
        expect(panel.textContent).toContain('Test Panel');
    });

    it('creates <a> element for link rules', function() {
        var rules = [
            { type: 'link', match: 'tel:', event: 'click_phone', mobileOnly: false, newTab: false }
        ];
        GTMToolkit._renderTestPanel(rules);
        var panel = getPanel();
        var linkEl = panel.querySelector('a');
        expect(linkEl).not.toBeNull();
        expect(linkEl.href).toContain('tel:');
        expect(linkEl.textContent).toContain('click_phone');
    });

    it('creates <button> for selector rules', function() {
        var rules = [
            { type: 'selector', selector: '.chat-btn', event: 'click_chat', mobileOnly: false, newTab: false }
        ];
        GTMToolkit._renderTestPanel(rules);
        var panel = getPanel();
        var btnEl = panel.querySelector('button.chat-btn');
        expect(btnEl).not.toBeNull();
        expect(btnEl.textContent).toContain('click_chat');
    });

    it('creates simulate button for form rules', function() {
        var rules = [
            { type: 'form', formSelector: '.gform', successSelector: '.success', event: 'form_done', mobileOnly: false, newTab: false }
        ];
        GTMToolkit._renderTestPanel(rules);
        var panel = getPanel();
        var btns = panel.querySelectorAll('button');
        var formBtn = null;
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].textContent.indexOf('simulate') !== -1) {
                formBtn = btns[i];
                break;
            }
        }
        expect(formBtn).not.toBeNull();
        expect(formBtn.textContent).toContain('form_done');
    });

    it('shows (mobile) label for mobileOnly rules', function() {
        var rules = [
            { type: 'link', match: 'tel:', event: 'click_phone', mobileOnly: true, newTab: false }
        ];
        GTMToolkit._renderTestPanel(rules);
        var panel = getPanel();
        var linkEl = panel.querySelector('a');
        expect(linkEl.textContent).toContain('(mobile)');
    });

    it('renders multiple rules', function() {
        var rules = [
            { type: 'link', match: 'tel:', event: 'click_phone', mobileOnly: false, newTab: false },
            { type: 'selector', selector: '.btn', event: 'click_btn', mobileOnly: false, newTab: false },
            { type: 'form', formSelector: '.f', successSelector: '.s', event: 'form', mobileOnly: false, newTab: false }
        ];
        GTMToolkit._renderTestPanel(rules);
        var panel = getPanel();
        // 1 label (span) + 1 link (a) + 1 selector (button) + 1 form (button)
        expect(panel.children.length).toBeGreaterThanOrEqual(4);
    });

    it('infers correct sample href for mailto links', function() {
        var rules = [
            { type: 'link', match: 'mailto:', event: 'click_email', mobileOnly: false, newTab: false }
        ];
        GTMToolkit._renderTestPanel(rules);
        var panel = getPanel();
        var linkEl = panel.querySelector('a');
        expect(linkEl.href).toContain('mailto:');
    });

    it('infers correct sample href for maps links', function() {
        var rules = [
            { type: 'link', match: ['goo.gl/maps', 'maps.google.com'], event: 'click_directions', mobileOnly: false, newTab: false }
        ];
        GTMToolkit._renderTestPanel(rules);
        var panel = getPanel();
        var linkEl = panel.querySelector('a');
        expect(linkEl.href).toContain('maps.google.com');
    });

    it('infers correct sample href for RegExp tel match', function() {
        var rules = [
            { type: 'link', match: /tel:\+?\d+/, event: 'click_phone_regex', mobileOnly: false, newTab: false }
        ];
        GTMToolkit._renderTestPanel(rules);
        var panel = getPanel();
        var linkEl = panel.querySelector('a');
        expect(linkEl.href).toContain('tel:');
    });

    it('form simulate button creates success element when form exists', function() {
        var form = document.createElement('div');
        form.className = 'gform';
        document.body.appendChild(form);

        var rules = [
            { type: 'form', formSelector: '.gform', successSelector: '.success', event: 'form_done', mobileOnly: false, newTab: false }
        ];
        GTMToolkit._renderTestPanel(rules);
        var panel = getPanel();
        var btns = panel.querySelectorAll('button');
        var formBtn = null;
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].textContent.indexOf('simulate') !== -1) {
                formBtn = btns[i];
                break;
            }
        }

        formBtn.click();

        var success = form.querySelector('.success');
        expect(success).not.toBeNull();
        expect(success.textContent).toBe('Test success');
        document.body.removeChild(form);
    });

    it('form simulate button warns when form not found', function() {
        var spy = jest.spyOn(console, 'warn').mockImplementation(function() {});

        var rules = [
            { type: 'form', formSelector: '.missing-form', successSelector: '.success', event: 'form_done', mobileOnly: false, newTab: false }
        ];
        GTMToolkit._renderTestPanel(rules);
        var panel = getPanel();
        var btns = panel.querySelectorAll('button');
        var formBtn = null;
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].textContent.indexOf('simulate') !== -1) {
                formBtn = btns[i];
                break;
            }
        }

        formBtn.click();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});
