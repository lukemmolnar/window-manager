/**
 * Cache Manager Utility
 * 
 * This utility helps manage browser caching, especially to prevent issues
 * after application updates where users might see a white screen until 
 * they manually clear their cache.
 */

// Generate a unique version identifier based on build timestamp
// This should change with each new build/deployment
const APP_VERSION = Date.now().toString();
const VERSION_KEY = 'app_version';

/**
 * Checks the stored application version against the current version
 * and invalidates cache if there's a version mismatch.
 * 
 * @returns {boolean} True if the cache was cleared (version changed), false otherwise
 */
export const checkAndUpdateVersion = () => {
  try {
    // Get stored version from localStorage
    const storedVersion = localStorage.getItem(VERSION_KEY);
    
    // If no stored version or versions don't match, we have a new deployment
    if (!storedVersion || storedVersion !== APP_VERSION) {
      console.log('Application updated! Clearing cache...');
      
      // Store the new version
      localStorage.setItem(VERSION_KEY, APP_VERSION);
      
      // If service workers are supported, unregister them to clear cache
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
            console.log('ServiceWorker unregistered');
          });
        });
      }
      
      // Clear browser caches if supported
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
            console.log(`Cache ${cacheName} deleted`);
          });
        });
      }
      
      // If there was a version mismatch and we cleared caches, return true
      return true;
    }
    
    // No version change detected
    return false;
  } catch (error) {
    // If we encounter errors during cache management, log them but don't break the app
    console.error('Error managing cache:', error);
    return false;
  }
};

/**
 * Forces a page reload to ensure clean state
 * This is useful after clearing caches to ensure all new assets are loaded
 */
export const forceReload = () => {
  window.location.reload(true);
};

export default {
  checkAndUpdateVersion,
  forceReload
};
