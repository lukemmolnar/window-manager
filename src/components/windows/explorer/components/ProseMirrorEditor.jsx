import React, { useEffect, useRef, useState } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, Node } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
import { 
  baseKeymap, 
  toggleMark, 
  setBlockType, 
  wrapIn
} from 'prosemirror-commands';
import { 
  wrapInList, 
  splitListItem, 
  liftListItem, 
  sinkListItem 
} from 'prosemirror-schema-list';
import { InputRule, inputRules, wrappingInputRule, textblockTypeInputRule, smartQuotes, emDash, ellipsis } from 'prosemirror-inputrules';
import { tableEditing, columnResizing, goToNextCell, deleteTable, addRowAfter, addRowBefore, deleteRow, addColumnAfter, addColumnBefore, deleteColumn } from 'prosemirror-tables';
import { 
  Bold, Italic, Code, List, ListOrdered, Quote, 
  Undo2, Redo2, Table, RotateCcw, Trash2, Plus, Minus
} from 'lucide-react';
import './ProseMirrorEditor.css';

// Import table nodes
import { tableNodes } from 'prosemirror-tables';

// Create enhanced schema with tables and lists
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block').append(tableNodes({
    tableGroup: 'block',
    cellContent: 'block+',
    cellAttributes: {
      background: {
        default: null,
        getFromDOM(dom) { return dom.style.backgroundColor || null },
        setDOMAttr(value, attrs) { if (value) attrs.style = (attrs.style || '') + `background-color: ${value};` }
      }
    }
  })),
  marks: schema.spec.marks
});

// Custom table creation function
function createSimpleTable(schema, rows = 3, cols = 3, withHeaderRow = true) {
  const tableRows = [];
  
  for (let i = 0; i < rows; i++) {
    const cells = [];
    const isHeaderRow = withHeaderRow && i === 0;
    
    for (let j = 0; j < cols; j++) {
      const cellType = isHeaderRow ? schema.nodes.table_header : schema.nodes.table_cell;
      const cell = cellType.create(null, [
        schema.nodes.paragraph.create()
      ]);
      cells.push(cell);
    }
    
    const row = schema.nodes.table_row.create(null, cells);
    tableRows.push(row);
  }
  
  return schema.nodes.table.create(null, tableRows);
}

// Create input rules for markdown-style shortcuts
function buildInputRules(schema) {
  const rules = smartQuotes.concat(ellipsis, emDash);
  
  // Bold with **text**
  rules.push(new InputRule(/\*\*([^\*]+)\*\*$/, (state, match, start, end) => {
    const { tr } = state;
    tr.delete(start, end).insertText(match[1]);
    return tr.addMark(start, start + match[1].length, schema.marks.strong.create());
  }));
  
  // Italic with *text*
  rules.push(new InputRule(/\*([^\*]+)\*$/, (state, match, start, end) => {
    const { tr } = state;
    tr.delete(start, end).insertText(match[1]);
    return tr.addMark(start, start + match[1].length, schema.marks.em.create());
  }));
  
  // Code with `text`
  rules.push(new InputRule(/`([^`]+)`$/, (state, match, start, end) => {
    const { tr } = state;
    tr.delete(start, end).insertText(match[1]);
    return tr.addMark(start, start + match[1].length, schema.marks.code.create());
  }));
  
  // Headings
  for (let i = 1; i <= 6; i++) {
    rules.push(textblockTypeInputRule(
      new RegExp(`^#{${i}}\\s$`),
      schema.nodes.heading,
      { level: i }
    ));
  }
  
  // Blockquote
  rules.push(wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote));
  
  // Code block
  rules.push(textblockTypeInputRule(/^```$/, schema.nodes.code_block));
  
  // Bullet list
  rules.push(wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bullet_list));
  
  // Ordered list
  rules.push(wrappingInputRule(/^\s*(\d+)\.\s$/, schema.nodes.ordered_list));
  
  return inputRules({ rules });
}

// Helper function to check if cursor is inside a table
const isInTable = (state) => {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.spec.tableRole) return true;
  }
  return false;
};

// Toolbar component
const EditorToolbar = ({ view, disabled, onStateUpdate }) => {
  const [activeMarks, setActiveMarks] = useState(new Set());
  const [currentBlockType, setCurrentBlockType] = useState('paragraph');
  const [inTable, setInTable] = useState(false);
  
  // Update active states when selection changes
  useEffect(() => {
    if (!view) return;
    
    const updateState = () => {
      const { state } = view;
      const { from, to, empty } = state.selection;
      
      // Get active marks
      const marks = new Set();
      if (empty) {
        // Get marks that would be applied to typed text
        const storedMarks = state.storedMarks || state.selection.$from.marks();
        storedMarks.forEach(mark => marks.add(mark.type.name));
      } else {
        // Get marks that apply to the entire selection
        state.doc.nodesBetween(from, to, (node) => {
          node.marks.forEach(mark => marks.add(mark.type.name));
        });
      }
      setActiveMarks(marks);
      
      // Check if cursor is in a table
      setInTable(isInTable(state));
      
      // Get current block type
      const $from = state.selection.$from;
      const blockType = $from.parent.type.name;
      setCurrentBlockType(blockType);
    };
    
    updateState();
    
    // Store update function for external calls
    if (onStateUpdate) {
      onStateUpdate(updateState);
    }
    
    // Listen for focus/blur events
    view.dom.addEventListener('focus', updateState);
    view.dom.addEventListener('blur', updateState);
    
    return () => {
      view.dom.removeEventListener('focus', updateState);
      view.dom.removeEventListener('blur', updateState);
    };
  }, [view, onStateUpdate]);
  
  const runCommand = (command) => {
    if (disabled || !view) return false;
    return command(view.state, view.dispatch, view);
  };
  
  const toggleMarkCommand = (markType) => {
    return runCommand(toggleMark(markType));
  };
  
  const setBlockTypeCommand = (nodeType, attrs = {}) => {
    return runCommand(setBlockType(nodeType, attrs));
  };
  
  const wrapInCommand = (nodeType, attrs = {}) => {
    return runCommand(wrapIn(nodeType, attrs));
  };
  
  const insertTable = () => {
    const table = createSimpleTable(mySchema, 3, 3, true);
    const tr = view.state.tr.replaceSelectionWith(table);
    view.dispatch(tr);
  };
  
  const ToolbarButton = ({ onClick, active, disabled: buttonDisabled, title, children, variant = 'default' }) => {
    const baseClasses = "p-2 rounded flex items-center justify-center";
    const variantClasses = {
      default: active 
        ? "bg-teal-600 text-white" 
        : "hover:bg-stone-700 text-teal-400",
      dropdown: "hover:bg-stone-700 text-teal-400 px-2"
    };
    
    return (
      <button
        onMouseDown={(e) => {
          e.preventDefault(); // Prevent focus shift away from editor
          if (!disabled && !buttonDisabled && onClick) {
            onClick(e);
          }
        }}
        disabled={disabled || buttonDisabled}
        className={`${baseClasses} ${variantClasses[variant]} ${disabled || buttonDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={title}
      >
        {children}
      </button>
    );
  };
  
  const ToolbarDivider = () => (
    <div className="w-px h-6 bg-stone-600 mx-1" />
  );
  
  return (
    <div className="border-b border-stone-700 bg-stone-800 p-2 flex items-center gap-1 flex-wrap">
      {/* Undo/Redo */}
      <ToolbarButton onClick={() => runCommand(undo)} title="Undo (Ctrl+Z)">
        <Undo2 size={18} />
      </ToolbarButton>
      <ToolbarButton onClick={() => runCommand(redo)} title="Redo (Ctrl+Y)">
        <Redo2 size={18} />
      </ToolbarButton>
      
      <ToolbarDivider />
      
      {/* Headings Dropdown */}
      <select
        value={currentBlockType === 'heading' ? `heading-${view?.state.selection.$from.parent.attrs.level || 1}` : currentBlockType}
        onChange={(e) => {
          const value = e.target.value;
          if (value.startsWith('heading-')) {
            const level = parseInt(value.split('-')[1]);
            setBlockTypeCommand(mySchema.nodes.heading, { level });
          } else if (value === 'paragraph') {
            setBlockTypeCommand(mySchema.nodes.paragraph);
          } else if (value === 'code_block') {
            setBlockTypeCommand(mySchema.nodes.code_block);
          }
        }}
        className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-teal-100 focus:outline-none focus:border-teal-600 min-w-[100px]"
        disabled={disabled}
      >
        <option value="paragraph">Paragraph</option>
        <option value="heading-1">Heading 1</option>
        <option value="heading-2">Heading 2</option>
        <option value="heading-3">Heading 3</option>
        <option value="heading-4">Heading 4</option>
        <option value="heading-5">Heading 5</option>
        <option value="heading-6">Heading 6</option>
        <option value="code_block">Code Block</option>
      </select>
      
      <ToolbarDivider />
      
      {/* Text Formatting */}
      <ToolbarButton 
        onClick={() => toggleMarkCommand(mySchema.marks.strong)}
        active={activeMarks.has('strong')}
        title="Bold (Ctrl+B)"
      >
        <Bold size={18} />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => toggleMarkCommand(mySchema.marks.em)}
        active={activeMarks.has('em')}
        title="Italic (Ctrl+I)"
      >
        <Italic size={18} />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => toggleMarkCommand(mySchema.marks.code)}
        active={activeMarks.has('code')}
        title="Code (Ctrl+`)"
      >
        <Code size={18} />
      </ToolbarButton>
      
      <ToolbarDivider />
      
      {/* Lists */}
      <ToolbarButton 
        onClick={() => runCommand(wrapInList(mySchema.nodes.bullet_list))}
        active={currentBlockType === 'bullet_list'}
        title="Bullet List"
      >
        <List size={18} />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => runCommand(wrapInList(mySchema.nodes.ordered_list))}
        active={currentBlockType === 'ordered_list'}
        title="Numbered List"
      >
        <ListOrdered size={18} />
      </ToolbarButton>
      
      <ToolbarDivider />
      
      {/* Block Elements */}
      <ToolbarButton 
        onClick={() => wrapInCommand(mySchema.nodes.blockquote)}
        active={currentBlockType === 'blockquote'}
        title="Blockquote"
      >
        <Quote size={18} />
      </ToolbarButton>
      
      <ToolbarDivider />
      
      {/* Table */}
      <ToolbarButton onClick={insertTable} title="Insert Table">
        <Table size={18} />
      </ToolbarButton>
      
      {/* Table Management (only show when in table) */}
      {inTable && (
        <>
          <ToolbarButton 
            onClick={() => runCommand(deleteTable)}
            title="Delete Table"
          >
            <Trash2 size={18} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => runCommand(addRowAfter)}
            title="Add Row After"
          >
            <Plus size={18} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => runCommand(deleteRow)}
            title="Delete Row"
          >
            <Minus size={18} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => runCommand(addColumnAfter)}
            title="Add Column After"
          >
            <div className="flex items-center">
              <Plus size={14} />
              <div className="w-px h-3 bg-current ml-1" />
            </div>
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => runCommand(deleteColumn)}
            title="Delete Column"
          >
            <div className="flex items-center">
              <Minus size={14} />
              <div className="w-px h-3 bg-current ml-1" />
            </div>
          </ToolbarButton>
        </>
      )}
      
      <ToolbarDivider />
      
      {/* Clear Formatting */}
      <ToolbarButton 
        onClick={() => {
          const { state, dispatch } = view;
          const { from, to } = state.selection;
          const tr = state.tr;
          
          // Remove all marks from selection
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.marks.length > 0) {
              const start = Math.max(from, pos);
              const end = Math.min(to, pos + node.nodeSize);
              node.marks.forEach(mark => {
                tr.removeMark(start, end, mark.type);
              });
            }
          });
          
          dispatch(tr);
        }}
        title="Clear Formatting"
      >
        <RotateCcw size={18} />
      </ToolbarButton>
    </div>
  );
};

const ProseMirrorEditor = ({ 
  content = '', 
  onChange, 
  onSave,
  placeholder = 'Start typing your markdown here...',
  className = '',
  readOnly = false 
}) => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const toolbarUpdateRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const lastExternalContentRef = useRef(content);
  const isInternalChangeRef = useRef(false);

  // Create the editor view only once or when readOnly changes
  useEffect(() => {
    if (!editorRef.current) return;

    // Parse the initial JSON content
    let doc;
    try {
      console.log('ProseMirror: Creating editor with content:', content?.substring(0, 100) + '...');
      if (content && content.trim()) {
        // Try to parse as JSON first
        const jsonContent = JSON.parse(content);
        doc = Node.fromJSON(mySchema, jsonContent);
        lastExternalContentRef.current = content;
      } else {
        // Create empty document with a paragraph
        doc = mySchema.nodes.doc.create([
          mySchema.nodes.paragraph.create()
        ]);
      }
    } catch (error) {
      console.error('Error parsing ProseMirror JSON:', error);
      // Fallback: create empty document or try to parse as plain text
      if (content && content.trim()) {
        try {
          // If JSON parsing failed, treat as plain text and create a paragraph
          doc = mySchema.nodes.doc.create([
            mySchema.nodes.paragraph.create(null, [
              mySchema.text(content)
            ])
          ]);
          lastExternalContentRef.current = content;
        } catch (fallbackError) {
          console.error('Fallback parsing failed:', fallbackError);
          doc = mySchema.nodes.doc.create([
            mySchema.nodes.paragraph.create()
          ]);
        }
      } else {
        doc = mySchema.nodes.doc.create([
          mySchema.nodes.paragraph.create()
        ]);
      }
    }

    // Create enhanced plugins array
    const plugins = [
      buildInputRules(mySchema),
      history(),
      keymap({
        // Text formatting shortcuts
        'Mod-b': toggleMark(mySchema.marks.strong),
        'Mod-i': toggleMark(mySchema.marks.em),
        'Mod-`': toggleMark(mySchema.marks.code),
        
        // List shortcuts  
        'Shift-Ctrl-8': wrapInList(mySchema.nodes.bullet_list),
        'Shift-Ctrl-9': wrapInList(mySchema.nodes.ordered_list),
        
        // List item navigation
        'Tab': sinkListItem(mySchema.nodes.list_item),
        'Shift-Tab': liftListItem(mySchema.nodes.list_item),
        'Enter': splitListItem(mySchema.nodes.list_item),
        
        // Table navigation
        'Tab': goToNextCell(1),
        'Shift-Tab': goToNextCell(-1),
        
        // Block shortcuts
        'Ctrl-Shift-0': setBlockType(mySchema.nodes.paragraph),
        'Ctrl-Shift-1': setBlockType(mySchema.nodes.heading, { level: 1 }),
        'Ctrl-Shift-2': setBlockType(mySchema.nodes.heading, { level: 2 }),
        'Ctrl-Shift-3': setBlockType(mySchema.nodes.heading, { level: 3 }),
        'Ctrl-Shift-4': setBlockType(mySchema.nodes.heading, { level: 4 }),
        'Ctrl-Shift-5': setBlockType(mySchema.nodes.heading, { level: 5 }),
        'Ctrl-Shift-6': setBlockType(mySchema.nodes.heading, { level: 6 }),
        
        // Quote
        'Ctrl-Shift-.': wrapIn(mySchema.nodes.blockquote),
        
        // Save
        'Mod-s': () => {
          if (onSave && viewRef.current) {
            const jsonContent = JSON.stringify(viewRef.current.state.doc.toJSON(), null, 2);
            onSave(jsonContent);
            return true;
          }
          return false;
        }
      }),
      keymap(baseKeymap),
      columnResizing(),
      tableEditing()
    ];

    // Create the editor state
    const state = EditorState.create({
      doc,
      plugins
    });

    // Create the editor view
    const view = new EditorView(editorRef.current, {
      state,
      editable: () => !readOnly,
      dispatchTransaction: (transaction) => {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        
        // Trigger toolbar update on selection changes or doc changes
        if (toolbarUpdateRef.current && (transaction.selectionSet || transaction.docChanged)) {
          // Use setTimeout to ensure the update happens after the state is applied
          setTimeout(() => {
            if (toolbarUpdateRef.current) {
              toolbarUpdateRef.current();
            }
          }, 0);
        }
        
        // Call onChange with the JSON content
        if (onChange && transaction.docChanged) {
          isInternalChangeRef.current = true;
          const jsonContent = JSON.stringify(newState.doc.toJSON(), null, 2);
          onChange(jsonContent);
          // Reset the flag after the state update
          setTimeout(() => {
            isInternalChangeRef.current = false;
          }, 0);
        }
      },
      attributes: {
        class: `prose prose-invert max-w-none focus:outline-none ${className}`,
        style: 'min-height: 200px; padding: 1rem;'
      }
    });

    viewRef.current = view;
    setIsReady(true);

    // Cleanup function
    return () => {
      if (view) {
        view.destroy();
      }
      viewRef.current = null;
      setIsReady(false);
    };
  }, [readOnly]); // Only recreate when readOnly changes

  // Handle external content changes (from file loading)
  useEffect(() => {
    if (!viewRef.current || !isReady) return;
    
    // Skip if this is an internal change (from user typing)
    if (isInternalChangeRef.current) {
      return;
    }

    // Only update if content actually changed externally
    if (content !== lastExternalContentRef.current) {
      console.log('ProseMirror: External content change detected, updating editor');
      
      try {
        let doc;
        if (content && content.trim()) {
          // Try to parse as JSON
          const jsonContent = JSON.parse(content);
          doc = Node.fromJSON(mySchema, jsonContent);
        } else {
          doc = mySchema.nodes.doc.create([
            mySchema.nodes.paragraph.create()
          ]);
        }

        // Get current selection to preserve cursor position if possible
        const currentSelection = viewRef.current.state.selection;
        
        // Create new state with updated content
        const newState = EditorState.create({
          doc,
          plugins: viewRef.current.state.plugins,
          // Try to preserve selection if the document structure allows it
          selection: currentSelection && doc.content.size >= currentSelection.from ? currentSelection : undefined
        });
        
        viewRef.current.updateState(newState);
        lastExternalContentRef.current = content;
      } catch (error) {
        console.error('Error updating editor with external content:', error);
      }
    }
  }, [content, isReady]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <EditorToolbar 
        view={viewRef.current} 
        disabled={!isReady || readOnly}
        onStateUpdate={(updateFn) => {
          toolbarUpdateRef.current = updateFn;
        }}
      />
      
      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div 
          ref={editorRef}
          className="w-full h-full bg-stone-800 text-teal-50 prose-headings:text-teal-100 prose-a:text-teal-400 prose-strong:text-teal-100 prose-em:text-teal-200 prose-code:text-teal-300 prose-pre:bg-stone-900 prose-blockquote:border-teal-600 prose-hr:border-stone-600"
          style={{ minHeight: '400px' }}
        />
        {!isReady && (
          <div className="flex items-center justify-center h-full">
            <span className="text-teal-300">Loading editor...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProseMirrorEditor;
