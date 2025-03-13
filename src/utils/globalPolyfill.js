// Define global as window for browser environment
window.global = window;

// Define process.env for browser environment
window.process = window.process || {};
window.process.env = window.process.env || {};
window.process.browser = true;

// Import and use the buffer package for a complete Buffer polyfill
import { Buffer as BufferPolyfill } from 'buffer';
window.Buffer = BufferPolyfill;

// Basic stream polyfill
if (typeof window.stream === 'undefined') {
  window.stream = {
    Readable: class Readable {
      constructor() {
        this.readableFlowing = null;
        this.listeners = {};
      }
      on(event, callback) {
        this.listeners[event] = callback;
        return this;
      }
      pipe() {
        return this;
      }
    },
    Writable: class Writable {
      constructor() {
        this.listeners = {};
      }
      on(event, callback) {
        this.listeners[event] = callback;
        return this;
      }
      write() {
        return true;
      }
      end() {}
    },
    Duplex: class Duplex {
      constructor() {
        this.listeners = {};
      }
      on(event, callback) {
        this.listeners[event] = callback;
        return this;
      }
    }
  };
}
