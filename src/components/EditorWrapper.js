// src/components/EditorWrapper.js
import React, { useEffect, useMemo, memo, useRef, useState } from 'react'; // Import useState
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import MenuBar from './MenuBar';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

const EditorWrapper = ({ initialContent, onContentChange, setEditorRef }) => {
  // Use a local state for TipTap's content, managed internally by EditorWrapper
  // This content will be initialized from initialContent, but then updated by TipTap itself.
  const [editorLocalContent, setEditorLocalContent] = useState(initialContent);

  // This ref ensures initial content is set only once after editor is ready
  const isEditorInitialized = useRef(false);

  console.log("EditorWrapper: Rendering. Local content state:", editorLocalContent, "initialContent prop:", initialContent); // DEBUG LOG

  const extensions = useMemo(() => {
    return [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ];
  }, []);

  const editor = useEditor({
    extensions,
    // Content is set here from local state.
    // The key is that `editorLocalContent` will be updated by `onUpdate`,
    // not by the `initialContent` prop after the first render.
    content: editorLocalContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setEditorLocalContent(html); // Update internal state
      onContentChange(html); // Pass up to parent
      console.log("EditorWrapper: onUpdate fired. Editor HTML:", html); // DEBUG LOG
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none editor-content-area',
      },
    },
    editable: true,
  });

  // Effect for initial content setting and subsequent explicit content resets (e.g., from parent)
  useEffect(() => {
    if (editor) {
      // On initial mount, set content from prop.
      // Or if the initialContent prop is explicitly reset to '<p></p>' by the parent.
      if (!isEditorInitialized.current || (initialContent === '<p></p>' && editorLocalContent !== '<p></p>')) {
        console.log("EditorWrapper: Setting editor content based on initialContent prop:", initialContent); // DEBUG LOG
        editor.commands.setContent(initialContent, false); // false to prevent triggering onUpdate immediately
        setEditorLocalContent(initialContent); // Keep local state in sync
        isEditorInitialized.current = true; // Mark as initialized
      }
    }
  }, [editor, initialContent, editorLocalContent]); // Add editorLocalContent as dependency

  // Pass editor instance back to parent via ref
  useEffect(() => {
    console.log("EditorWrapper: Mounted/editor instance available."); // DEBUG LOG
    if (setEditorRef && editor) {
      setEditorRef(editor);
    }
    // Cleanup function
    return () => {
      console.log("EditorWrapper: Unmounting/Destroying editor."); // DEBUG LOG
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor, setEditorRef]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="edit-content-editor" />
    </>
  );
};

export default memo(EditorWrapper);