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

// Enhanced stream polyfill
if (typeof window.stream === 'undefined') {
  window.stream = {
    Readable: class Readable {
      constructor() {
        this.readableFlowing = null;
        this.listeners = {};
        this._readableState = { 
          flowing: null,
          ended: false,
          endEmitted: false,
          reading: false,
          sync: true,
          needReadable: false,
          emittedReadable: false,
          length: 0,
          buffer: []
        };
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
        this._writableState = {
          ended: false,
          ending: false,
          finished: false,
          destroyed: false
        };
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
        this._readableState = { 
          flowing: null,
          ended: false,
          endEmitted: false,
          reading: false,
          sync: true,
          needReadable: false,
          emittedReadable: false,
          length: 0,
          buffer: []
        };
        this._writableState = {
          ended: false,
          ending: false,
          finished: false,
          destroyed: false
        };
      }
      on(event, callback) {
        this.listeners[event] = callback;
        return this;
      }
    }
  };
}
