/**
 * Debug Logger Utility
 * Provides functionality to enable/disable console logging
 * for debugging purposes in the application.
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

// Track debug state
let debugEnabled = false;

const DebugLogger = {
  /**
   * Toggle debug mode on or off
   * @param {boolean} [force] - Optional parameter to force a specific state
   * @returns {boolean} Current debug state after toggling
   */
  toggleDebug: (force) => {
    if (typeof force === 'boolean') {
      debugEnabled = force;
    } else {
      debugEnabled = !debugEnabled;
    }

    if (debugEnabled) {
      // Restore original console methods
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
      console.log('Debug mode enabled');
    } else {
      // Replace console methods with empty functions
      console.log = function() {};
      console.warn = function() {};
      console.info = function() {};
      console.debug = function() {};
      // Keep error logging enabled for critical errors
      // console.error = function() {};
    }

    return debugEnabled;
  },

  /**
   * Get current debug state
   * @returns {boolean} Current debug state
   */
  isDebugEnabled: () => {
    return debugEnabled;
  },

  /**
   * Initialize the debug logger (disables logging by default)
   */
  init: () => {
    // By default, disable logging when app starts
    if (!debugEnabled) {
      DebugLogger.toggleDebug(false);
    }
  }
};

export default DebugLogger;
