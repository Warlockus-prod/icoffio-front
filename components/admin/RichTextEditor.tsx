'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Rich Text Editor Component (WYSIWYG)
 * 
 * Использует TipTap для продвинутого редактирования текста
 * 
 * Поддерживаемые функции:
 * - Форматирование: Bold, Italic, Strike, Code
 * - Заголовки: H1, H2, H3
 * - Списки: Bullet list, Ordered list
 * - Ссылки: Add/Edit/Remove links
 * - Блоки: Blockquote, Code block
 * - История: Undo/Redo
 */
export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[300px] px-4 py-3',
        'data-gramm': 'false',
        'data-gramm_editor': 'false',
        'data-enable-grammarly': 'false',
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar - Sticky на мобильных */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 p-2 md:p-2 flex flex-wrap gap-1">
        {/* Text Formatting */}
        <div className="flex gap-1 pr-2 border-r border-gray-300 dark:border-gray-600">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] text-sm font-semibold rounded hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors touch-none ${
              editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] text-sm italic rounded hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors touch-none ${
              editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={`hidden md:inline-flex px-3 py-1.5 min-h-[36px] text-sm line-through rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive('strike') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Strikethrough"
          >
            S
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={!editor.can().chain().focus().toggleCode().run()}
            className={`hidden md:inline-flex px-3 py-1.5 min-h-[36px] text-xs font-mono rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive('code') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Inline Code"
          >
            {'</>'}
          </button>
        </div>

        {/* Headings */}
        <div className="flex gap-1 pr-2 border-r border-gray-300 dark:border-gray-600">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] text-sm font-bold rounded hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors touch-none ${
              editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] text-sm font-bold rounded hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors touch-none ${
              editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Heading 2"
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`hidden sm:inline-flex px-3 py-1.5 min-h-[36px] text-sm font-bold rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Heading 3"
          >
            H3
          </button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 pr-2 border-r border-gray-300 dark:border-gray-600">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors touch-none ${
              editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Bullet List"
          >
            <span className="hidden sm:inline">•</span> List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`hidden sm:inline-flex px-3 py-1.5 min-h-[36px] text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Numbered List"
          >
            1. List
          </button>
        </div>

        {/* Blocks - hidden on mobile */}
        <div className="hidden md:flex gap-1 pr-2 border-r border-gray-300 dark:border-gray-600">
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`px-3 py-1.5 min-h-[36px] text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive('blockquote') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Blockquote"
          >
            " Quote
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`px-3 py-1.5 min-h-[36px] text-xs font-mono rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive('codeBlock') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Code Block"
          >
            {'{ code }'}
          </button>
        </div>

        {/* Link */}
        <div className="flex gap-1 pr-2 border-r border-gray-300 dark:border-gray-600">
          <button
            onClick={setLink}
            className={`px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors touch-none ${
              editor.isActive('link') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Add Link"
          >
            🔗 <span className="hidden sm:inline">Link</span>
          </button>
          {editor.isActive('link') && (
            <button
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] text-sm rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors touch-none"
              title="Remove Link"
            >
              ✕
            </button>
          )}
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed touch-none"
            title="Undo (Ctrl+Z)"
          >
            ↶<span className="hidden sm:inline"> Undo</span>
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed touch-none"
            title="Redo (Ctrl+Y)"
          >
            ↷<span className="hidden sm:inline"> Redo</span>
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
    </div>
  );
}
