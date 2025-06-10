import React, { useEffect, useRef, useState } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { MarkdownParser, MarkdownSerializer } from 'prosemirror-markdown';
import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { baseKeymap } from 'prosemirror-commands';
import MarkdownIt from 'markdown-it';
import './ProseMirrorEditor.css';

// Create schema with list support
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
  marks: schema.spec.marks
});

// Create markdown-it instance with breaks enabled
const md = new MarkdownIt('commonmark', { 
  html: false,
  breaks: true,  // Enable line break parsing
  linkify: false,
  typographer: false
});

// Create markdown parser and serializer
const markdownParser = new MarkdownParser(mySchema, md, {
  blockquote: { block: 'blockquote' },
  paragraph: { block: 'paragraph' },
  list_item: { block: 'list_item' },
  bullet_list: { block: 'bullet_list' },
  ordered_list: { block: 'ordered_list' },
  heading: { block: 'heading', getAttrs: (token) => ({ level: +token.attrGet('level') }) },
  code_block: { block: 'code_block', noCloseToken: true },
  hr: { node: 'horizontal_rule' },
  image: {
    node: 'image',
    getAttrs: (token) => ({
      src: token.attrGet('src'),
      title: token.attrGet('title') || null,
      alt: token.children[0]?.content || null
    })
  },
  hardbreak: { node: 'hard_break' },
  softbreak: { node: 'hard_break' }, // Map soft breaks to hard breaks for consistency
  em: { mark: 'em' },
  strong: { mark: 'strong' },
  link: {
    mark: 'link',
    getAttrs: (token) => ({
      href: token.attrGet('href'),
      title: token.attrGet('title') || null
    })
  },
  code_inline: { mark: 'code' }
});

const markdownSerializer = new MarkdownSerializer({
  blockquote: (state, node) => {
    state.wrapBlock('> ', null, node, () => state.renderContent(node));
  },
  code_block: (state, node) => {
    state.write('```\n');
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write('```');
    state.closeBlock(node);
  },
  heading: (state, node) => {
    state.write(state.repeat('#', node.attrs.level) + ' ');
    state.renderInline(node);
    state.closeBlock(node);
  },
  horizontal_rule: (state, node) => {
    state.write(node.attrs.markup || '---');
    state.closeBlock(node);
  },
  bullet_list: (state, node) => {
    state.renderList(node, '  ', () => '- ');
  },
  ordered_list: (state, node) => {
    let start = node.attrs.order || 1;
    let maxW = String(start + node.childCount - 1).length;
    let space = state.repeat(' ', maxW + 2);
    state.renderList(node, space, (i) => {
      let nStr = String(start + i);
      return state.repeat(' ', maxW - nStr.length) + nStr + '. ';
    });
  },
  list_item: (state, node) => {
    state.renderContent(node);
  },
  paragraph: (state, node) => {
    state.renderInline(node);
    state.closeBlock(node);
  },
  image: (state, node) => {
    state.write(
      '![' +
        state.esc(node.attrs.alt || '') +
        '](' +
        state.esc(node.attrs.src) +
        (node.attrs.title ? ' ' + state.quote(node.attrs.title) : '') +
        ')'
    );
  },
  hard_break: (state, node) => {
    state.write('\n');
  },
  text: (state, node) => {
    state.text(node.text);
  }
}, {
  em: { open: '*', close: '*' },
  strong: { open: '**', close: '**' },
  link: {
    open(_state, mark, parent, index) {
      return isPlainURL(mark, parent, index, 1) ? '<' : '[';
    },
    close(state, mark, parent, index) {
      return isPlainURL(mark, parent, index, -1)
        ? '>'
        : '](' +
            state.esc(mark.attrs.href) +
            (mark.attrs.title ? ' ' + state.quote(mark.attrs.title) : '') +
            ')';
    }
  },
  code: { open: '`', close: '`' }
});

function isPlainURL(link, parent, index, side) {
  if (link.attrs.title || !/^\w+:/.test(link.attrs.href)) return false;
  let content = parent.child(index + (side < 0 ? -1 : 0));
  if (!content.isText || content.text !== link.attrs.href || content.marks[content.marks.length - 1] !== link) return false;
  if (index === (side < 0 ? 1 : parent.childCount - 1)) return true;
  let next = parent.child(index + (side < 0 ? -2 : 1));
  return !link.isInSet(next.marks);
}

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

    // Parse the initial markdown content
    let doc;
    try {
      console.log('ProseMirror: Creating editor with content:', content?.substring(0, 100) + '...');
      if (content && content.trim()) {
        doc = markdownParser.parse(content);
        lastExternalContentRef.current = content;
      } else {
        // Create empty document with a paragraph
        doc = mySchema.nodes.doc.create([
          mySchema.nodes.paragraph.create()
        ]);
      }
    } catch (error) {
      console.error('Error parsing markdown:', error);
      // Fallback to plain text in a paragraph
      if (content && content.trim()) {
        try {
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
              const markdown = markdownSerializer.serialize(viewRef.current.state.doc);
              onSave(markdown);
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
        
        // Call onChange with the markdown content
        if (onChange && transaction.docChanged) {
          isInternalChangeRef.current = true;
          const markdown = markdownSerializer.serialize(newState.doc);
          onChange(markdown);
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
          doc = markdownParser.parse(content);
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
