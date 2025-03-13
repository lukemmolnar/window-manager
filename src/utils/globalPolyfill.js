// This file is now simplified as vite-plugin-node-polyfills handles most polyfills

// Ensure global is defined as window
window.global = window;

// Ensure process.browser is set to true for SimplePeer
window.process = window.process || {};
window.process.browser = true;

// Add any additional polyfills or global variables needed for SimplePeer here
