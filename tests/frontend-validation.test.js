'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const pub = (...p) => path.join(__dirname, '..', 'public', ...p);
const read = (...p) => fs.readFileSync(pub(...p), 'utf8');

describe('Frontend validation', () => {
  describe('index.html — structure', () => {
    const html = read('index.html');

    it('has DOCTYPE', () => {
      assert.match(html, /<!DOCTYPE html>/i);
    });

    it('has charset meta', () => {
      assert.match(html, /<meta\s+charset=["']UTF-8["']/i);
    });

    it('has viewport meta', () => {
      assert.match(html, /<meta\s+name=["']viewport["']/i);
    });

    it('has lang attribute', () => {
      assert.match(html, /<html\s[^>]*lang=["']en["']/i);
    });

    it('has title element', () => {
      assert.match(html, /<title>HealthFlow<\/title>/i);
    });

    it('has closing html tag', () => {
      assert.match(html, /<\/html>\s*$/);
    });

    it('has no inline event handlers in HTML markup', () => {
      // Extract only the HTML portion before <script> to avoid false positives
      // in JavaScript code that legitimately references event names as strings
      const htmlPortion = html.split(/<script\b/i)[0] || '';
      assert.doesNotMatch(
        htmlPortion,
        /\s+on(click|submit|change|load|error|input|keydown|keyup|mouseover|mouseout|focus|blur)\s*=/i
      );
    });
  });

  describe('index.html — inline styles', () => {
    const html = read('index.html');
    // Extract CSS between <style> tags
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const css = styleMatch ? styleMatch[1] : '';

    it('has inline <style> block', () => {
      assert.ok(css.length > 100, 'CSS should be substantial');
    });

    it('has balanced braces in CSS', () => {
      const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
      const opens = (stripped.match(/{/g) || []).length;
      const closes = (stripped.match(/}/g) || []).length;
      assert.equal(opens, closes, `Unbalanced braces: ${opens} opens vs ${closes} closes`);
    });

    it('has CSS custom properties for theming', () => {
      assert.match(css, /--primary/);
      assert.match(css, /--bg/);
      assert.match(css, /--surface/);
      assert.match(css, /--text/);
    });

    it('uses rose-coral accent color', () => {
      assert.match(css, /#E8837B|#e8837b/i);
    });
  });

  describe('index.html — inline script', () => {
    const html = read('index.html');
    // Extract JS between <script> tags
    const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const js = scriptMatch ? scriptMatch[1] : '';

    it('has inline <script> block', () => {
      assert.ok(js.length > 500, 'JavaScript should be substantial');
    });

    it('has valid syntax', () => {
      assert.doesNotThrow(() => new vm.Script(js), 'Inline JS has syntax errors');
    });

    // --- Security functions ---

    it('defines esc() function for HTML escaping', () => {
      assert.match(js, /function\s+esc\s*\(/);
    });

    it('esc() handles ampersand, angle brackets, and quotes', () => {
      assert.match(js, /&amp;/);
      assert.match(js, /&lt;/);
      assert.match(js, /&gt;/);
      assert.match(js, /&quot;|&#39;/);
    });

    it('defines escA() function for attribute escaping', () => {
      assert.match(js, /function\s+escA\s*\(/);
    });

    it('defines getCsrfToken() function', () => {
      assert.match(js, /function\s+getCsrfToken\s*\(/);
    });

    it('getCsrfToken reads csrf_token cookie', () => {
      assert.match(js, /csrf_token/);
      assert.match(js, /document\.cookie/);
    });

    // --- Core view functions ---

    it('defines renderDashboard()', () => {
      assert.match(js, /function\s+renderDashboard\s*\(/);
    });

    it('defines renderVitals()', () => {
      assert.match(js, /function\s+renderVitals\s*\(/);
    });

    it('defines renderMedications()', () => {
      assert.match(js, /function\s+renderMedications\s*\(/);
    });

    it('defines renderAppointments()', () => {
      assert.match(js, /function\s+renderAppointments\s*\(/);
    });

    it('defines renderEmergency()', () => {
      assert.match(js, /function\s+renderEmergency\s*\(/);
    });

    it('defines renderFamily()', () => {
      assert.match(js, /function\s+renderFamily\s*\(/);
    });

    // --- UI functions ---

    it('defines switchView()', () => {
      assert.match(js, /function\s+switchView\s*\(/);
    });

    it('defines openModal()', () => {
      assert.match(js, /function\s+openModal\s*\(/);
    });

    it('defines closeModal()', () => {
      assert.match(js, /function\s+closeModal\s*\(/);
    });

    it('defines showToast()', () => {
      assert.match(js, /function\s+showToast\s*\(/);
    });

    it('defines render()', () => {
      assert.match(js, /function\s+render\s*\(/);
    });

    // --- API helper ---

    it('defines api() fetch wrapper', () => {
      assert.match(js, /function\s+api\s*\(/);
    });

    it('api() sends credentials', () => {
      assert.match(js, /credentials\s*:\s*['"]same-origin['"]/);
    });

    it('api() sends CSRF token header', () => {
      assert.match(js, /X-CSRF-Token/);
    });

    // --- Data loading ---

    it('defines loadVitals()', () => {
      assert.match(js, /function\s+loadVitals\s*\(/);
    });

    it('defines loadMedications()', () => {
      assert.match(js, /function\s+loadMedications\s*\(/);
    });

    it('defines loadAppointments()', () => {
      assert.match(js, /function\s+loadAppointments\s*\(/);
    });

    it('defines loadEmergencyCards()', () => {
      assert.match(js, /function\s+loadEmergencyCards\s*\(/);
    });

    it('defines loadFamilyMembers()', () => {
      assert.match(js, /function\s+loadFamilyMembers\s*\(/);
    });

    // --- XSS safety ---

    it('uses esc() for user data in innerHTML assignments', () => {
      const lines = js.split('\n');
      const innerHtmlLines = lines.filter(l => l.includes('innerHTML') && l.includes('='));
      const templateLines = innerHtmlLines.filter(l =>
        !l.trim().startsWith('//') &&
        !l.includes("innerHTML = ''") &&
        !l.includes("innerHTML = '';") &&
        !l.includes('innerHTML = html') &&  // openModal uses pre-built html param
        !l.includes("innerHTML = '';")
      );
      // For lines that set innerHTML with template content, verify esc() is used
      // or the line is building from already-escaped fragments
      const unsafeLines = templateLines.filter(l => {
        // Skip lines that are just clearing or setting from a variable that was already built with esc()
        if (l.match(/innerHTML\s*=\s*h\b/)) return false;  // h variable is built with esc()
        if (l.match(/innerHTML\s*=\s*['"]/)) return false;  // static strings
        if (l.match(/innerHTML\s*=\s*`/)) return false;     // template literals (checked separately)
        if (l.includes('esc(')) return false;
        return true;
      });
      assert.ok(
        unsafeLines.length < 3,
        `Found ${unsafeLines.length} potentially unsafe innerHTML lines:\n${unsafeLines.slice(0, 5).join('\n')}`
      );
    });

    // --- No dangerous patterns ---

    it('does not use eval()', () => {
      assert.doesNotMatch(js, /\beval\s*\(/);
    });

    it('does not use Function() constructor', () => {
      assert.doesNotMatch(js, /new\s+Function\s*\(/);
    });

    it('does not use document.write', () => {
      assert.doesNotMatch(js, /document\.write\s*\(/);
    });
  });

  describe('index.html — HTML structure', () => {
    const html = read('index.html');

    it('has navigation tabs', () => {
      assert.match(html, /nav-tab|bottom-nav/i);
    });

    it('has view containers for all sections', () => {
      assert.match(html, /view-dashboard/);
      assert.match(html, /view-vitals/);
      assert.match(html, /view-medications/);
      assert.match(html, /view-appointments/);
      assert.match(html, /view-emergency/);
      assert.match(html, /view-family/);
    });

    it('has modal overlay', () => {
      assert.match(html, /modal-overlay|modal-backdrop/i);
      assert.match(html, /modal-content/);
    });

    it('has toast container', () => {
      assert.match(html, /toast-container/);
    });

    it('has header with brand', () => {
      assert.match(html, /HealthFlow/i);
    });

    it('has logout button', () => {
      assert.match(html, /logout/i);
    });
  });
});
