// Reset button for IndexedDB databases
(() => {
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', () => {
    // Create a button element with styles
    const resetButton = document.createElement('button');
    resetButton.innerText = 'Reset IndexedDB';
    resetButton.style.position = 'fixed';
    resetButton.style.bottom = '20px';
    resetButton.style.right = '20px';
    resetButton.style.padding = '10px 15px';
    resetButton.style.backgroundColor = '#e53e3e';
    resetButton.style.color = 'white';
    resetButton.style.border = 'none';
    resetButton.style.borderRadius = '4px';
    resetButton.style.fontWeight = 'bold';
    resetButton.style.zIndex = '9999';
    resetButton.style.cursor = 'pointer';
    resetButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';

    // Add hover effect
    resetButton.addEventListener('mouseover', () => {
      resetButton.style.backgroundColor = '#c53030';
    });
    resetButton.addEventListener('mouseout', () => {
      resetButton.style.backgroundColor = '#e53e3e';
    });

    // Add click handler
    resetButton.addEventListener('click', async () => {
      if (confirm('This will reset the IndexedDB database and refresh the page. This should fix canvas state loading errors. Continue?')) {
        try {
          // Get all IndexedDB databases
          const databases = await indexedDB.databases();
          
          // Delete each database
          for (const db of databases) {
            console.log(`Deleting IndexedDB database: ${db.name}`);
            indexedDB.deleteDatabase(db.name);
          }
          
          // Reload the page
          alert('IndexedDB reset successful. The page will now reload.');
          window.location.reload();
        } catch (error) {
          console.error('Error resetting IndexedDB:', error);
          alert(`Error resetting IndexedDB: ${error.message}`);
        }
      }
    });

    // Add button to the page
    document.body.appendChild(resetButton);
  });
})();
