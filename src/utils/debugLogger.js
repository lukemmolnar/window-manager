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

// LocalStorage key for debug state persistence
const DEBUG_STORAGE_KEY = 'slumterm_debug_mode';

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

    // Save debug state to localStorage
    try {
      localStorage.setItem(DEBUG_STORAGE_KEY, debugEnabled.toString());
    } catch (error) {
      console.error('Failed to save debug state to localStorage:', error);
    }

    if (debugEnabled) {
      // Restore original console methods
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
      console.log('Debug mode enabled - logs will persist across refreshes');
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
   * Initialize the debug logger and restore saved state
   */
  init: () => {
    // Try to load debug state from localStorage
    try {
      const savedDebugState = localStorage.getItem(DEBUG_STORAGE_KEY);
      if (savedDebugState !== null) {
        // Restore saved debug state
        const shouldEnable = savedDebugState === 'true';
        DebugLogger.toggleDebug(shouldEnable);
        console.log(`Debug mode restored from localStorage: ${shouldEnable ? 'enabled' : 'disabled'}`);
      } else {
        // No saved state, disable by default
        DebugLogger.toggleDebug(false);
      }
    } catch (error) {
      console.error('Failed to load debug state from localStorage:', error);
      // Fallback to disabled state
      DebugLogger.toggleDebug(false);
    }
  }
};

export default DebugLogger;
