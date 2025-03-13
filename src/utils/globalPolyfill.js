// Define global as window for browser environment
window.global = window;

// Define process.env for browser environment
window.process = window.process || {};
window.process.env = window.process.env || {};
window.process.browser = true;
window.process.nextTick = function(callback) {
  setTimeout(callback, 0);
};

// Import and use the buffer package for a complete Buffer polyfill
import { Buffer as BufferPolyfill } from 'buffer';
window.Buffer = BufferPolyfill;

// Import the vite-compatible-readable-stream package
import * as ReadableStream from 'vite-compatible-readable-stream';

// Use the vite-compatible-readable-stream package for stream polyfill
if (typeof window.stream === 'undefined') {
  window.stream = ReadableStream;
}
