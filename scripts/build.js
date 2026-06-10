#!/usr/bin/env node

'use strict';

var fs = require('fs');
var path = require('path');
var terser = require('terser');

var ROOT = path.join(__dirname, '..');
var DIST = path.join(ROOT, 'dist');
var PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// ---------------------------------------------------------------------------
// Module order: explicit, not alphabetical. Core must load first.
// ---------------------------------------------------------------------------
var SRC = path.join(ROOT, 'src');

var moduleOrder = ['core', 'listeners', 'signals', 'test-panel'];
var modules = moduleOrder.map(function(name) {
  var filePath = path.join(SRC, name + '.js');
  if (!fs.existsSync(filePath)) {
    console.error('Missing source file: ' + name + '.js');
    process.exit(1);
  }
  return { name: name, path: filePath };
});

if (modules.length === 0) {
  console.error('No source files found in src/. Expected *.js files (excluding *.test.js).');
  process.exit(1);
}

console.log('Discovered modules:');
modules.forEach(function(m) { console.log('  ' + m.name); });

// ---------------------------------------------------------------------------
// Concatenate
// ---------------------------------------------------------------------------
var header = [
  '/**',
  ' * GTM Toolkit v' + PKG.version + ' - Bundle',
  ' * ' + PKG.description,
  ' * Modules: ' + modules.map(function(m) { return m.name; }).join(', '),
  ' * Built: ' + new Date().toISOString(),
  ' * @license ' + PKG.license,
  ' * @repository https://github.com/' + PKG.repository,
  ' *',
  ' * Auto-generated from source modules. Do not edit directly.',
  ' */'
].join('\n');

var source = modules.map(function(m) {
  return fs.readFileSync(m.path, 'utf8');
}).join('\n');

var bundle = header + '\n' + source;

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'gtm-toolkit.js'), bundle);
console.log('Wrote dist/gtm-toolkit.js (' + bundle.length + ' bytes)');

// ---------------------------------------------------------------------------
// Minify
// ---------------------------------------------------------------------------
terser.minify(bundle, {
  compress: { passes: 2 },
  mangle: true,
  output: { comments: /^!|@license/ }
}).then(function(result) {
  if (result.error) {
    console.error('Minification failed:', result.error);
    process.exit(1);
  }
  fs.writeFileSync(path.join(DIST, 'gtm-toolkit.min.js'), result.code);
  console.log('Wrote dist/gtm-toolkit.min.js (' + result.code.length + ' bytes)');
}).catch(function(err) {
  console.error('Minification error:', err);
  process.exit(1);
});
