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
import './ProseMirrorEditor.css';

// Create schema with list support
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
  marks: schema.spec.marks
});

// Create markdown parser and serializer
const markdownParser = new MarkdownParser(mySchema, {
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
  hard_break: (state, node, parent, index) => {
    for (let i = index + 1; i < parent.childCount; i++) {
      if (parent.child(i).type !== node.type) {
        state.write('\\\n');
        return;
      }
    }
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

  useEffect(() => {
    if (!editorRef.current) return;

    // Parse the markdown content
    let doc;
    try {
      doc = markdownParser.parse(content || '');
    } catch (error) {
      console.error('Error parsing markdown:', error);
      doc = mySchema.nodes.doc.create(
        mySchema.nodes.paragraph.create()
      );
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
          const markdown = markdownSerializer.serialize(newState.doc);
          onChange(markdown);
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

  // Update content when it changes externally
  useEffect(() => {
    if (!viewRef.current || !isReady) return;

    const currentMarkdown = markdownSerializer.serialize(viewRef.current.state.doc);
    if (currentMarkdown !== content) {
      try {
        const doc = markdownParser.parse(content || '');
        const newState = EditorState.create({
          doc,
          plugins: viewRef.current.state.plugins
        });
        viewRef.current.updateState(newState);
      } catch (error) {
        console.error('Error updating editor content:', error);
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
