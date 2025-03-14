// Import the actual process module
import process from 'process';

// Ensure global is defined as window
window.global = window;

// Use the actual process module instead of our basic polyfill
window.process = process;

// Ensure browser property is set (SimplePeer checks this)
window.process.browser = true;
