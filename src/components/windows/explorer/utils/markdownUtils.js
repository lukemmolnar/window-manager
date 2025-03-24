import showdown from 'showdown';

// Initialize Showdown converter for Markdown with enhanced options
export const createMarkdownConverter = () => {
  const converter = new showdown.Converter({
    tables: true,
    tasklists: true,
    strikethrough: true,
    emoji: true,
    breaks: true,  // Enable line breaks to be rendered as <br> tags
    simpleLineBreaks: true,
    openLinksInNewWindow: true,
    backslashEscapesHTMLTags: true,
    ghCodeBlocks: true,
    ghCompatibleHeaderId: true,
    ghMentions: true,
    smoothLivePreview: true
  });
  
  // Enable additional extensions
  converter.setFlavor('github');
  
  return converter;
};

// Insert markdown syntax at cursor position
export const insertMarkdown = (textareaRef, fileContent, setFileContent, prefix, suffix = '') => {
  const textarea = textareaRef.current;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = fileContent;
  
  // If text is selected, wrap it with prefix and suffix
  if (start !== end) {
    const selectedText = text.substring(start, end);
    const newContent = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    setFileContent(newContent);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = end + prefix.length;
      textarea.focus();
    }, 0);
  } else {
    // No selection, just insert at cursor
    const newContent = text.substring(0, start) + prefix + suffix + text.substring(start);
    setFileContent(newContent);
    
    // Move cursor between prefix and suffix
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
      textarea.focus();
    }, 0);
  }
};

// Insert list items
export const insertList = (textareaRef, fileContent, setFileContent, listPrefix) => {
  const textarea = textareaRef.current;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = fileContent;
  
  // If text is selected, apply list formatting to each line
  if (start !== end) {
    const selectedText = text.substring(start, end);
    const lines = selectedText.split('\n');
    
    // Format each line as a list item
    const formattedLines = lines.map(line => {
      // Skip empty lines
      if (line.trim() === '') return line;
      
      // For numbered lists, increment the number for each line
      if (listPrefix === '1. ') {
        const index = lines.indexOf(line) + 1;
        return `${index}. ${line}`;
      }
      
      return `${listPrefix}${line}`;
    });
    
    const newContent = text.substring(0, start) + formattedLines.join('\n') + text.substring(end);
    setFileContent(newContent);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.selectionStart = start;
      textarea.selectionEnd = start + formattedLines.join('\n').length;
      textarea.focus();
    }, 0);
  } else {
    // No selection, just insert at cursor
    const newContent = text.substring(0, start) + listPrefix + text.substring(start);
    setFileContent(newContent);
    
    // Move cursor after the inserted prefix
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + listPrefix.length;
      textarea.focus();
    }, 0);
  }
};

// Get the current line of text at cursor position
export const getCurrentLine = (text, cursorPos) => {
  const textBeforeCursor = text.substring(0, cursorPos);
  const lineStartPos = textBeforeCursor.lastIndexOf('\n') + 1;
  const lineEndPos = text.indexOf('\n', cursorPos);
  const actualLineEndPos = lineEndPos !== -1 ? lineEndPos : text.length;
  return text.substring(lineStartPos, actualLineEndPos);
};

// Handle keyboard events in the editor
export const handleEditorKeyDown = (e, textareaRef, fileContent, setFileContent) => {
  // Handle keyboard shortcuts
  if (e.ctrlKey || e.metaKey) {
    // Ctrl+B or Cmd+B for bold
    if (e.key === 'b') {
      e.preventDefault();
      insertMarkdown(textareaRef, fileContent, setFileContent, '**', '**');
      return;
    }
    
    // Ctrl+I or Cmd+I for italic
    if (e.key === 'i') {
      e.preventDefault();
      insertMarkdown(textareaRef, fileContent, setFileContent, '*', '*');
      return;
    }
    
    // Ctrl+Shift+L for unordered list
    if (e.shiftKey && e.key === 'L') {
      e.preventDefault();
      insertList(textareaRef, fileContent, setFileContent, '- ');
      return;
    }
    
    // Ctrl+Shift+O for ordered list
    if (e.shiftKey && e.key === 'O') {
      e.preventDefault();
      insertList(textareaRef, fileContent, setFileContent, '1. ');
      return;
    }
    
    // Ctrl+Shift+C for checklist
    if (e.shiftKey && e.key === 'C') {
      e.preventDefault();
      insertList(textareaRef, fileContent, setFileContent, '- [ ] ');
      return;
    }
  }
  
  // Auto-continue lists on Enter
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const text = fileContent;
    const currentLine = getCurrentLine(text, cursorPos);
    
    // Check for list patterns
    const bulletListMatch = currentLine.match(/^(\s*)(-|\*|\+)\s+(.*)/);
    const numberedListMatch = currentLine.match(/^(\s*)(\d+)\.?\s+(.*)/);
    const checklistMatch = currentLine.match(/^(\s*)(-|\*|\+)\s+\[([ xX])\]\s+(.*)/);
    
    if (bulletListMatch || numberedListMatch || checklistMatch) {
      // Get the indentation and list marker
      let indentation, marker, content;
      
      if (checklistMatch) {
        indentation = checklistMatch[1];
        marker = checklistMatch[2];
        const checkState = checklistMatch[3];
        content = checklistMatch[4];
        
        // If the checklist item is empty, remove the list marker
        if (content.trim() === '') {
          e.preventDefault();
          const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
          const newContent = text.substring(0, lineStart) + text.substring(cursorPos);
          setFileContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
            textarea.focus();
          }, 0);
          return;
        }
        
        // Continue the checklist with an unchecked box
        e.preventDefault();
        const newListItem = `\n${indentation}${marker} [ ] `;
        insertMarkdown(textareaRef, fileContent, setFileContent, newListItem);
        return;
      } else if (bulletListMatch) {
        indentation = bulletListMatch[1];
        marker = bulletListMatch[2];
        content = bulletListMatch[3];
        
        // If the list item is empty, remove the list marker
        if (content.trim() === '') {
          e.preventDefault();
          const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
          const newContent = text.substring(0, lineStart) + text.substring(cursorPos);
          setFileContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
            textarea.focus();
          }, 0);
          return;
        }
        
        // Continue the bullet list
        e.preventDefault();
        const newListItem = `\n${indentation}${marker} `;
        insertMarkdown(textareaRef, fileContent, setFileContent, newListItem);
        return;
      } else if (numberedListMatch) {
        indentation = numberedListMatch[1];
        const number = parseInt(numberedListMatch[2], 10);
        content = numberedListMatch[3];
        
        // If the list item is empty, remove the list marker
        if (content.trim() === '') {
          e.preventDefault();
          const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
          const newContent = text.substring(0, lineStart) + text.substring(cursorPos);
          setFileContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
            textarea.focus();
          }, 0);
          return;
        }
        
        // Continue the numbered list with incremented number
        e.preventDefault();
        const newListItem = `\n${indentation}${number + 1}. `;
        insertMarkdown(textareaRef, fileContent, setFileContent, newListItem);
        return;
      }
    }
  }
  
  // Handle tab for indentation in lists
  if (e.key === 'Tab') {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const text = fileContent;
    const currentLine = getCurrentLine(text, cursorPos);
    
    // Check if we're in a list item
    const listMatch = currentLine.match(/^(\s*)(-|\*|\+|\d+\.|\[[ xX]\])\s+/);
    if (listMatch) {
      e.preventDefault();
      
      // Add or remove indentation based on shift key
      if (e.shiftKey) {
        // Outdent: remove 2 spaces from the beginning if they exist
        if (currentLine.startsWith('  ')) {
          const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
          const lineEnd = text.indexOf('\n', cursorPos);
          const actualLineEnd = lineEnd !== -1 ? lineEnd : text.length;
          
          const newContent = text.substring(0, lineStart) + currentLine.substring(2) + text.substring(actualLineEnd);
          setFileContent(newContent);
          
          // Adjust cursor position
          const newCursorPos = cursorPos - 2;
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = newCursorPos > lineStart ? newCursorPos : lineStart;
            textarea.focus();
          }, 0);
        }
      } else {
        // Indent: add 2 spaces at the beginning
        const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
        const lineEnd = text.indexOf('\n', cursorPos);
        const actualLineEnd = lineEnd !== -1 ? lineEnd : text.length;
        
        const newContent = text.substring(0, lineStart) + '  ' + currentLine + text.substring(actualLineEnd);
        setFileContent(newContent);
        
        // Adjust cursor position
        const newCursorPos = cursorPos + 2;
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;
          textarea.focus();
        }, 0);
      }
    }
  }
};

// Convert markdown to HTML
export const convertMarkdownToHtml = (converter, markdown) => {
  return converter.makeHtml(markdown);
};
