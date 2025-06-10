import React, { useEffect, useRef, useState } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, Node } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { baseKeymap } from 'prosemirror-commands';
import './ProseMirrorEditor.css';

// Create schema with list support
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
  marks: schema.spec.marks
});

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

    // Create the editor state
    const state = EditorState.create({
      doc,
      plugins: [
        history(),
        keymap(baseKeymap),
        keymap({
          'Mod-s': () => {
            if (onSave && viewRef.current) {
              const jsonContent = JSON.stringify(viewRef.current.state.doc.toJSON(), null, 2);
              onSave(jsonContent);
              return true;
            }
            return false;
          }
        })
      ]
    });

    // Create the editor view
    const view = new EditorView(editorRef.current, {
      state,
      editable: () => !readOnly,
      dispatchTransaction: (transaction) => {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        
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
  );
};

export default ProseMirrorEditor;
