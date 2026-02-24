'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  /** Callback fired when user clicks an image in the editor. Receives current src, returns new src (or null to cancel). */
  onImageClick?: (currentSrc: string) => void;
  /** Enable image support (insert/replace toolbar) */
  enableImages?: boolean;
  /** Callback to open image picker (replaces window.prompt). Called with callback that receives selected URL. */
  onOpenImagePicker?: (callback: (url: string, alt?: string) => void, currentSrc?: string) => void;
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
  onImageClick,
  enableImages = false,
  onOpenImagePicker,
}: RichTextEditorProps) {
  const [selectedImage, setSelectedImage] = useState<{ src: string; pos: number } | null>(null);
  const imagePopoverRef = useRef<HTMLDivElement>(null);

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
      ...(enableImages
        ? [
            Image.configure({
              inline: false,
              allowBase64: false,
              HTMLAttributes: {
                class: 'rounded-lg max-w-full cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all',
              },
            }),
          ]
        : []),
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
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-3',
        'data-gramm': 'false',
        'data-gramm_editor': 'false',
        'data-enable-grammarly': 'false',
      },
      handleClick(view, pos, event) {
        if (!enableImages) return false;
        const target = event.target as HTMLElement;
        if (target.tagName === 'IMG') {
          const src = target.getAttribute('src') || '';
          setSelectedImage({ src, pos });
          if (onImageClick) {
            onImageClick(src);
          }
          return true;
        }
        setSelectedImage(null);
        return false;
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Close image popover on outside click
  useEffect(() => {
    if (!selectedImage) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (imagePopoverRef.current && !imagePopoverRef.current.contains(e.target as Node)) {
        setSelectedImage(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedImage]);

  const replaceSelectedImage = useCallback(
    (newSrc: string) => {
      if (!editor || !selectedImage) return;
      // Find and replace the image node
      const { state } = editor;
      let found = false;
      state.doc.descendants((node, pos) => {
        if (found) return false;
        if (node.type.name === 'image' && node.attrs.src === selectedImage.src) {
          editor
            .chain()
            .focus()
            .setNodeSelection(pos)
            .setImage({ src: newSrc, alt: node.attrs.alt || '' })
            .run();
          found = true;
          return false;
        }
      });
      setSelectedImage(null);
    },
    [editor, selectedImage]
  );

  const removeSelectedImage = useCallback(() => {
    if (!editor || !selectedImage) return;
    const { state } = editor;
    let found = false;
    state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.type.name === 'image' && node.attrs.src === selectedImage.src) {
        editor.chain().focus().setNodeSelection(pos).deleteSelection().run();
        found = true;
        return false;
      }
    });
    setSelectedImage(null);
  }, [editor, selectedImage]);

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

  const insertImage = () => {
    if (onOpenImagePicker) {
      onOpenImagePicker((url: string, alt?: string) => {
        editor.chain().focus().setImage({ src: url, alt: alt || '' }).run();
      });
    } else {
      const url = window.prompt('Enter image URL:');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
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

        {/* Image (when enabled) */}
        {enableImages && (
          <div className="flex gap-1 pr-2 border-r border-gray-300 dark:border-gray-600">
            <button
              onClick={insertImage}
              className="px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300 touch-none"
              title="Insert Image"
            >
              🖼️ <span className="hidden sm:inline">Image</span>
            </button>
          </div>
        )}

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

      {/* Inline Image Popover */}
      {enableImages && selectedImage && (
        <div
          ref={imagePopoverRef}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 flex items-center gap-2"
        >
          <img
            src={selectedImage.src}
            alt=""
            className="w-16 h-16 object-cover rounded"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="flex flex-col gap-1.5">
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={selectedImage.src}>
              {selectedImage.src.split('/').pop()?.substring(0, 30) || 'Image'}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onOpenImagePicker) {
                    onOpenImagePicker((url: string) => {
                      replaceSelectedImage(url);
                    }, selectedImage.src);
                  } else {
                    const newUrl = window.prompt('Enter new image URL:', selectedImage.src);
                    if (newUrl && newUrl !== selectedImage.src) {
                      replaceSelectedImage(newUrl);
                    }
                  }
                }}
                className="px-2.5 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded font-medium transition-colors"
              >
                Replace
              </button>
              <button
                onClick={() => {
                  const alt = window.prompt(
                    'Enter alt text:',
                    editor?.getAttributes('image').alt || ''
                  );
                  if (alt !== null && editor) {
                    const { state } = editor;
                    state.doc.descendants((node, pos) => {
                      if (node.type.name === 'image' && node.attrs.src === selectedImage.src) {
                        editor.chain().focus().setNodeSelection(pos).updateAttributes('image', { alt }).run();
                        return false;
                      }
                    });
                  }
                }}
                className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 rounded font-medium transition-colors"
              >
                Alt Text
              </button>
              <button
                onClick={removeSelectedImage}
                className="px-2.5 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded font-medium transition-colors"
              >
                Remove
              </button>
              <button
                onClick={() => setSelectedImage(null)}
                className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 rounded font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
    </div>
  );
}
