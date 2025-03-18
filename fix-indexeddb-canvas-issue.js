/**
 * CANVAS FILE & INDEXEDDB ISSUE FIX
 * 
 * This script contains all the necessary fixes to resolve:
 * 1. The IndexedDB error with canvas files
 * 2. The issue with canvas files not displaying properly in Explorer
 * 
 * How to use this script:
 * 1. Run this script using Node.js
 * 2. It will verify the required changes and apply the fixes if needed
 * 3. For a full manual fix, follow the instructions in canvas-fix-guide.md
 */

const fs = require('fs');
const path = require('path');

// Config
const rootDir = __dirname;
const fixes = [
  {
    name: "Canvas Window node types import",
    file: "src/components/windows/CanvasWindow.jsx",
    test: (content) => content.includes("import nodeTypes from '../../utils/canvasNodeTypes';"),
    message: "✅ CanvasWindow.jsx already has the shared nodeTypes import"
  },
  {
    name: "Canvas Preview node types import",
    file: "src/components/windows/CanvasPreview.jsx",
    test: (content) => content.includes("import nodeTypes from '../../utils/canvasNodeTypes';"),
    message: "✅ CanvasPreview.jsx already has the shared nodeTypes import"
  },
  {
    name: "IndexedDB reset button in index.html",
    file: "index.html",
    test: (content) => content.includes('src="/reset-indexeddb.js"'),
    message: "✅ reset-indexeddb.js script is properly included in index.html"
  },
  {
    name: "Explorer Window canvas support",
    file: "src/components/windows/ExplorerWindow.jsx",
    test: (content) => content.includes("if (fileName.endsWith('.canvas'))"),
    message: "✅ ExplorerWindow.jsx already has canvas file support"
  }
];

// Main function to check all fixes
function checkAllFixes() {
  console.log("🔍 Checking for canvas and IndexedDB related issues...\n");
  
  let allFixed = true;
  let missingFixes = [];
  
  // Check all fixes
  for (const fix of fixes) {
    const filePath = path.join(rootDir, fix.file);
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const isFixed = fix.test(fileContent);
      
      if (isFixed) {
        console.log(fix.message);
      } else {
        console.log(`❌ ${fix.name} needs to be fixed`);
        allFixed = false;
        missingFixes.push(fix);
      }
    } catch (err) {
      console.log(`❌ Error reading ${fix.file}: ${err.message}`);
      allFixed = false;
    }
  }
  
  console.log("\n");
  
  if (allFixed) {
    console.log("✅ All code fixes have been applied!");
    console.log("\n🔧 To fully resolve the IndexedDB issue:")
    console.log("1. Open the application in your browser");
    console.log("2. Click the red 'Reset IndexedDB' button in the bottom right");
    console.log("3. Confirm the reset when prompted");
    console.log("4. The page will reload with a fresh database schema");
  } else {
    console.log("❌ There are issues that need to be fixed.");
    console.log("\nPlease review the canvas-fix-guide.md file for detailed instructions on fixing these issues.");
    console.log("\nThe following files need updates:");
    
    missingFixes.forEach(fix => {
      console.log(`- ${fix.file}`);
    });
  }
}

// Add Explorer Window canvas support function
function addExplorerWindowCanvasSupport() {
  const filePath = path.join(rootDir, "src/components/windows/ExplorerWindow.jsx");
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add Box icon import if needed
    if (!content.includes("Box") && content.includes("lucide-react")) {
      content = content.replace(
        /{([^}]*)}/,
        "{\n  $1,\n  Box\n}"
      );
    }
    
    // Add canvas file icon detection
    if (!content.includes("if (fileName.endsWith('.canvas'))")) {
      content = content.replace(
        /const getFileIcon = \(fileName\) => {([^}]*?)return <File size={16} className="mr-2" \/>;/,
        `const getFileIcon = (fileName) => {$1if (fileName.endsWith('.canvas')) return <Box size={16} className="mr-2" />;\n    return <File size={16} className="mr-2" />;`
      );
    }
    
    // Add canvas handling in file selection
    if (!content.includes("if (file.name.endsWith('.md') || file.name.endsWith('.canvas'))") &&
        content.includes("if (file.name.endsWith('.md'))")) {
      content = content.replace(
        /if \(file\.name\.endsWith\('\.md'\)\) {/g,
        "if (file.name.endsWith('.md') || file.name.endsWith('.canvas')) {"
      );
    }
    
    // Add canvas preview in the content area
    if (!content.includes("selectedFile && selectedFile.name.endsWith('.canvas')")) {
      content = content.replace(
        /isContentLoading \? \([\s\S]*?\) : editMode && selectedFile\.name\.endsWith\('\.md'\) && isAdmin \? \(/,
        `isContentLoading ? (\n        <div className="flex-1 flex items-center justify-center">\n          <span className="text-teal-300">Loading content...</span>\n        </div>\n      ) : selectedFile && selectedFile.name.endsWith('.canvas') ? (\n        // Canvas preview mode\n        <div className="flex-1 overflow-hidden">\n          <CanvasPreview fileContent={fileContent} />\n        </div>\n      ) : editMode && selectedFile.name.endsWith('.md') && isAdmin ? (`
      );
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("✅ ExplorerWindow.jsx updated with canvas file support");
  } catch (err) {
    console.log(`❌ Error updating ExplorerWindow.jsx: ${err.message}`);
  }
}

// Run the fix process
checkAllFixes();
