/**
 * Listeners module tests
 */
'use strict';

// Load both modules so Jest instruments them
require('./core.js');
require('./listeners.js');

var GTMToolkit;

beforeEach(function() {
    window.GTMToolkit._reset();
    window.dataLayer = [];
    window.gtag = undefined;
    delete window.__TAG_ASSISTANT_API;
    GTMToolkit = window.GTMToolkit;
});

// Helper: simulate a click on an element via the real DOM
// Prevents default to avoid jsdom navigation errors on <a> elements
function simulateClick(element) {
    element.addEventListener('click', function(e) { e.preventDefault(); }, { once: true });
    var event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
}

describe('GTMToolkit Listeners', function() {

    describe('Link click - string match', function() {
        it('pushes event when href matches string', function() {
            GTMToolkit.onLinkClick('tel:', 'click_phone').start();

            var link = document.createElement('a');
            link.href = 'tel:+15551234567';
            document.body.appendChild(link);
            simulateClick(link);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_phone'; });
            expect(found.length).toBe(1);
            expect(found[0].link_url).toContain('tel:');
            document.body.removeChild(link);
        });

        it('does not push when href does not match', function() {
            GTMToolkit.onLinkClick('tel:', 'click_phone').start();

            var link = document.createElement('a');
            link.href = 'https://example.com';
            document.body.appendChild(link);
            simulateClick(link);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_phone'; });
            expect(found.length).toBe(0);
            document.body.removeChild(link);
        });
    });

    describe('Link click - array match', function() {
        it('pushes event when href matches any string in array', function() {
            GTMToolkit.onLinkClick(['goo.gl/maps', 'maps.google.com'], 'click_directions').start();

            var link = document.createElement('a');
            link.href = 'https://maps.google.com/maps?q=test';
            document.body.appendChild(link);
            simulateClick(link);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_directions'; });
            expect(found.length).toBe(1);
            document.body.removeChild(link);
        });

        it('matches first item in array', function() {
            GTMToolkit.onLinkClick(['goo.gl/maps', 'maps.google.com'], 'click_directions').start();

            var link = document.createElement('a');
            link.href = 'https://goo.gl/maps/abc123';
            document.body.appendChild(link);
            simulateClick(link);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_directions'; });
            expect(found.length).toBe(1);
            document.body.removeChild(link);
        });

        it('does not match when no items match', function() {
            GTMToolkit.onLinkClick(['goo.gl/maps', 'maps.google.com'], 'click_directions').start();

            var link = document.createElement('a');
            link.href = 'https://example.com';
            document.body.appendChild(link);
            simulateClick(link);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_directions'; });
            expect(found.length).toBe(0);
            document.body.removeChild(link);
        });
    });

    describe('Link click - RegExp match', function() {
        it('pushes event when href matches regex', function() {
            GTMToolkit.onLinkClick(/(goo\.gl\/maps|maps\.google\.com)/i, 'click_directions').start();

            var link = document.createElement('a');
            link.href = 'https://maps.google.com/maps?q=test';
            document.body.appendChild(link);
            simulateClick(link);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_directions'; });
            expect(found.length).toBe(1);
            document.body.removeChild(link);
        });
    });

    describe('Selector click', function() {
        it('pushes event when element matches selector', function() {
            GTMToolkit.onSelectorClick('.chat-btn', 'click_chat').start();

            var btn = document.createElement('button');
            btn.className = 'chat-btn';
            document.body.appendChild(btn);
            simulateClick(btn);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_chat'; });
            expect(found.length).toBe(1);
            document.body.removeChild(btn);
        });

        it('does not push when element does not match', function() {
            GTMToolkit.onSelectorClick('.chat-btn', 'click_chat').start();

            var btn = document.createElement('button');
            btn.className = 'other-btn';
            document.body.appendChild(btn);
            simulateClick(btn);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_chat'; });
            expect(found.length).toBe(0);
            document.body.removeChild(btn);
        });
    });

    describe('Per-rule transport', function() {
        it('uses per-rule transport override (toGA)', function() {
            var gtagCalls = [];
            window.gtag = function() { gtagCalls.push(Array.prototype.slice.call(arguments)); };

            GTMToolkit.toGTMDefault()
                .onLinkClick('tel:', 'click_phone').toGA()
                .start();

            var link = document.createElement('a');
            link.href = 'tel:+15551234567';
            document.body.appendChild(link);
            simulateClick(link);

            // Should have used gtag, not dataLayer
            var gtagEvents = gtagCalls.filter(function(c) { return c[1] === 'click_phone'; });
            expect(gtagEvents.length).toBe(1);
            document.body.removeChild(link);
        });

        it('uses default transport when no override', function() {
            GTMToolkit.toGTMDefault()
                .onLinkClick('tel:', 'click_phone')
                .start();

            var link = document.createElement('a');
            link.href = 'tel:+15551234567';
            document.body.appendChild(link);
            simulateClick(link);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_phone'; });
            expect(found.length).toBe(1);
            document.body.removeChild(link);
        });
    });

    describe('onlyMobile gating', function() {
        it('skips event on desktop when mobileOnly is set', function() {
            // jsdom has no mobile UA, so this should skip
            GTMToolkit.onLinkClick('tel:', 'click_phone').onlyMobile().start();

            var link = document.createElement('a');
            link.href = 'tel:+15551234567';
            document.body.appendChild(link);
            simulateClick(link);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_phone'; });
            expect(found.length).toBe(0);
            document.body.removeChild(link);
        });
    });

    describe('newTab modifier', function() {
        it('sets target=_blank and rel=noopener noreferrer on link', function() {
            GTMToolkit.onLinkClick('tel:', 'click_phone').newTab().start();

            var link = document.createElement('a');
            link.href = 'tel:+15551234567';
            document.body.appendChild(link);
            simulateClick(link);

            expect(link.getAttribute('target')).toBe('_blank');
            expect(link.getAttribute('rel')).toBe('noopener noreferrer');
            document.body.removeChild(link);
        });
    });

    describe('Form MutationObserver', function() {
        it('pushes event when success element appears inside form', function(done) {
            GTMToolkit.onFormSubmit('.gform', '.gform-success', 'form_done').start();

            var form = document.createElement('div');
            form.className = 'gform';
            form.id = 'form-1';
            document.body.appendChild(form);

            // Add success element after a tick (MutationObserver is async)
            var successEl = document.createElement('div');
            successEl.className = 'gform-success';
            form.appendChild(successEl);

            // MutationObserver fires async
            setTimeout(function() {
                var found = window.dataLayer.filter(function(e) { return e.event === 'form_done'; });
                expect(found.length).toBeGreaterThanOrEqual(1);
                expect(found[0].form_id).toBe('form-1');
                document.body.removeChild(form);
                done();
            }, 50);
        });
    });

    describe('Edge cases', function() {
        it('does nothing for link with empty href', function() {
            GTMToolkit.onLinkClick('tel:', 'click_phone').start();

            var link = document.createElement('a');
            // No href set - jsdom gives empty string
            document.body.appendChild(link);
            simulateClick(link);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_phone'; });
            expect(found.length).toBe(0);
            document.body.removeChild(link);
        });

        it('matches child element via closest()', function() {
            GTMToolkit.onSelectorClick('.parent-btn', 'click_parent').start();

            var parent = document.createElement('button');
            parent.className = 'parent-btn';
            var child = document.createElement('span');
            child.textContent = 'Click me';
            parent.appendChild(child);
            document.body.appendChild(parent);

            simulateClick(child);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_parent'; });
            expect(found.length).toBe(1);
            document.body.removeChild(parent);
        });

        it('skips selector mobileOnly on desktop', function() {
            // jsdom is desktop
            GTMToolkit.onSelectorClick('.chat-btn', 'click_chat').onlyMobile().start();

            var btn = document.createElement('button');
            btn.className = 'chat-btn';
            document.body.appendChild(btn);
            simulateClick(btn);

            var found = window.dataLayer.filter(function(e) { return e.event === 'click_chat'; });
            expect(found.length).toBe(0);
            document.body.removeChild(btn);
        });
    });

    describe('UAParser integration', function() {
        afterEach(function() {
            delete window.UAParser;
        });

        it('uses UAParser when available and returns device type', function() {
            window.UAParser = function() {};
            window.UAParser.prototype.getResult = function() {
                return { device: { type: 'mobile' } };
            };

            GTMToolkit.onLinkClick('tel:', 'click_phone').onlyMobile().start();

            var link = document.createElement('a');
            link.href = 'tel:+15551234567';
            document.body.appendChild(link);
            simulateClick(link);

            // Should fire because UAParser says mobile
            var found = window.dataLayer.filter(function(e) { return e.event === 'click_phone'; });
            expect(found.length).toBe(1);
            document.body.removeChild(link);
        });

        it('falls back to desktop when UAParser returns no device type', function() {
            window.UAParser = function() {};
            window.UAParser.prototype.getResult = function() {
                return { device: {} };
            };

            GTMToolkit.onLinkClick('tel:', 'click_phone').onlyMobile().start();

            var link = document.createElement('a');
            link.href = 'tel:+15551234567';
            document.body.appendChild(link);
            simulateClick(link);

            // Should skip because UAParser returned desktop
            var found = window.dataLayer.filter(function(e) { return e.event === 'click_phone'; });
            expect(found.length).toBe(0);
            document.body.removeChild(link);
        });
    });

    describe('Error handling', function() {
        it('catches and logs click handler errors', function() {
            var spy = jest.spyOn(console, 'error').mockImplementation(function() {});

            // Register a rule that will trigger, but break closest()
            GTMToolkit.onSelectorClick('.btn', 'click_test').start();

            // Create element that throws in closest()
            var bad = document.createElement('div');
            var origClosest = bad.closest;
            bad.closest = function() { throw new Error('boom'); };
            document.body.appendChild(bad);
            simulateClick(bad);

            var errorCalls = spy.mock.calls.filter(function(a) {
                return a[0] === '[GTMToolkit]' && typeof a[1] === 'string' && a[1].indexOf('Listener error') !== -1;
            });
            expect(errorCalls.length).toBe(1);
            bad.closest = origClosest;
            document.body.removeChild(bad);
            spy.mockRestore();
        });
    });

    describe('First-match-wins', function() {
        it('fires only the first matching link rule', function() {
            GTMToolkit
                .onLinkClick('maps.google.com', 'click_directions')
                .onLinkClick('google.com', 'click_google')
                .start();

            var link = document.createElement('a');
            link.href = 'https://maps.google.com/place';
            document.body.appendChild(link);
            simulateClick(link);

            var directions = window.dataLayer.filter(function(e) { return e.event === 'click_directions'; });
            var google = window.dataLayer.filter(function(e) { return e.event === 'click_google'; });
            expect(directions.length).toBe(1);
            expect(google.length).toBe(0);
            document.body.removeChild(link);
        });

        it('fires only the first matching selector rule', function() {
            GTMToolkit
                .onSelectorClick('.chat-btn.promo', 'click_promo_chat')
                .onSelectorClick('.chat-btn', 'click_chat')
                .start();

            var btn = document.createElement('button');
            btn.className = 'chat-btn promo';
            document.body.appendChild(btn);
            simulateClick(btn);

            var promo = window.dataLayer.filter(function(e) { return e.event === 'click_promo_chat'; });
            var chat = window.dataLayer.filter(function(e) { return e.event === 'click_chat'; });
            expect(promo.length).toBe(1);
            expect(chat.length).toBe(0);
            document.body.removeChild(btn);
        });

        it('fires catch-all selector when specific does not match', function() {
            GTMToolkit
                .onSelectorClick('.chat-btn.promo', 'click_promo_chat')
                .onSelectorClick('.chat-btn', 'click_chat')
                .start();

            var btn = document.createElement('button');
            btn.className = 'chat-btn';
            document.body.appendChild(btn);
            simulateClick(btn);

            var promo = window.dataLayer.filter(function(e) { return e.event === 'click_promo_chat'; });
            var chat = window.dataLayer.filter(function(e) { return e.event === 'click_chat'; });
            expect(promo.length).toBe(0);
            expect(chat.length).toBe(1);
            document.body.removeChild(btn);
        });

        it('fires only the first matching form rule (catch-all skipped)', function(done) {
            GTMToolkit
                .onFormSubmit('.specific-form', '.success', 'form_specific')
                .onFormSubmit('.generic-form', '.success', 'form_generic')
                .start();

            var form = document.createElement('div');
            form.className = 'specific-form generic-form';
            form.id = 'form-overlap';
            document.body.appendChild(form);

            var successEl = document.createElement('div');
            successEl.className = 'success';
            form.appendChild(successEl);

            setTimeout(function() {
                var specific = window.dataLayer.filter(function(e) { return e.event === 'form_specific'; });
                var generic = window.dataLayer.filter(function(e) { return e.event === 'form_generic'; });
                expect(specific.length).toBeGreaterThanOrEqual(1);
                expect(generic.length).toBe(0);
                document.body.removeChild(form);
                done();
            }, 50);
        });

        it('fires catch-all form rule when specific does not match', function(done) {
            GTMToolkit
                .onFormSubmit('.specific-form', '.success', 'form_specific')
                .onFormSubmit('.generic-form', '.success', 'form_generic')
                .start();

            var form = document.createElement('div');
            form.className = 'generic-form';
            form.id = 'form-catchall';
            document.body.appendChild(form);

            var successEl = document.createElement('div');
            successEl.className = 'success';
            form.appendChild(successEl);

            setTimeout(function() {
                var specific = window.dataLayer.filter(function(e) { return e.event === 'form_specific'; });
                var generic = window.dataLayer.filter(function(e) { return e.event === 'form_generic'; });
                expect(specific.length).toBe(0);
                expect(generic.length).toBeGreaterThanOrEqual(1);
                document.body.removeChild(form);
                done();
            }, 50);
        });
    });
});
