'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {Table}from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Image from '@tiptap/extension-image';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const SYMBOLS = ['α', 'β', 'γ', 'δ', 'Δ', 'μ', '±', '≤', '≥', '≠', '→', '↑', '↓', '°'];

export function RichTextEditor({
  value,
  onChange,
  minHeight = '140px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Subscript,
      Superscript,
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none focus:outline-none px-3 py-2.5 text-sm text-white',
        style: `min-height: ${minHeight}`,
      },
    },
  });

  if (!editor) {
    return (
      <div className="rounded-lg bg-[#181E28] border border-gray-700 p-3 text-xs text-gray-400">
        Loading editor...
      </div>
    );
  }

  function insertImageUrl() {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }

  return (
    <div className="rounded-lg bg-[#181E28] border border-gray-700 overflow-hidden">
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-700 bg-[#131822] text-xs">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded ${
            editor.isActive('bold') ? 'bg-[#2F80C9] text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded ${
            editor.isActive('italic') ? 'bg-[#2F80C9] text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={`px-2 py-1 rounded ${
            editor.isActive('subscript') ? 'bg-[#2F80C9] text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          X<sub>2</sub>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={`px-2 py-1 rounded ${
            editor.isActive('superscript') ? 'bg-[#2F80C9] text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          X<sup>2</sup>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="px-2 py-1 rounded text-gray-300 hover:bg-gray-800"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="px-2 py-1 rounded text-gray-300 hover:bg-gray-800"
        >
          1. List
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: true }).run()
          }
          className="px-2 py-1 rounded text-gray-300 hover:bg-gray-800"
        >
          + Table
        </button>
        <button
          type="button"
          onClick={insertImageUrl}
          className="px-2 py-1 rounded text-gray-300 hover:bg-gray-800"
        >
          + Image
        </button>

        <span className="mx-1 text-gray-600">|</span>
        {SYMBOLS.map((sym) => (
          <button
            key={sym}
            type="button"
            onClick={() => editor.chain().focus().insertContent(sym).run()}
            className="px-1.5 py-0.5 rounded text-gray-300 hover:bg-gray-800"
          >
            {sym}
          </button>
        ))}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}