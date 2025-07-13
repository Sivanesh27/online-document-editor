/* ─────────  src/pages/Editor.js  ───────── */
import 'react-quill/dist/quill.snow.css';

import React, { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import { io } from 'socket.io-client';
import { useLocation } from 'react-router-dom';

/* ── constants ───────────────────────────────────────────── */
const SAVE_INTERVAL_MS   = 2000;
const BACKEND_BASE_URL   = 'https://doc-editor-backend.onrender.com';   // <- your Render backend
const SOCKET_PATH        = '/socket.io';                                // default
const DOCUMENT_ID        = 'global-doc';

/* ─────────────────────────────────────────────────────────── */
export default function Editor() {
  /* sockets & quill refs */
  const [socket, setSocket] = useState(null);
  const [quill , setQuill ] = useState(null);
  const quillRef            = useRef();

  /* if we arrived from Home with a file’s text */
  const { state }           = useLocation();
  const initialContent      = state?.initialContent ?? '';

  /* ── 1. connect socket once ─────────────────────────────── */
  useEffect(() => {
    const s = io(BACKEND_BASE_URL, {
      path: SOCKET_PATH,
      transports: ['websocket'],   // Render likes pure WS; avoids polling timeouts
    });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  /* ── 2. load / join document ────────────────────────────── */
  useEffect(() => {
    if (!socket || !quill) return;

    socket.once('load-document', serverContent => {
      quill.setContents(serverContent || '');
      /* overwrite with file text if we came from Home */
      if (initialContent) quill.setText(initialContent);
      quill.enable();
    });

    socket.emit('get-document', DOCUMENT_ID);
  }, [socket, quill, initialContent]);

  /* ── 3. outgoing user edits ─────────────────────────────── */
  useEffect(() => {
    if (!socket || !quill) return;

    const handler = (delta, _oldDelta, source) => {
      if (source !== 'user') return;
      socket.emit('send-changes', { docId: DOCUMENT_ID, delta });
    };

    quill.on('text-change', handler);
    return () => quill.off('text-change', handler);
  }, [socket, quill]);

  /* ── 4. incoming edits from others ───────────────────────── */
  useEffect(() => {
    if (!socket || !quill) return;

    const handler = delta => quill.updateContents(delta);
    socket.on('receive-changes', handler);
    return () => socket.off('receive-changes', handler);
  }, [socket, quill]);

  /* ── 5. autosave every 2 s ──────────────────────────────── */
  useEffect(() => {
    if (!socket || !quill) return;
    const id = setInterval(() => {
      socket.emit('save-document', {
        docId  : DOCUMENT_ID,
        content: quill.getContents(),
      });
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [socket, quill]);

  /* ── 6. create Quill instance once ──────────────────────── */
  useEffect(() => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();
    editor.disable();
    editor.setText('Loading …');
    setQuill(editor);
  }, []);

  /* ── 7. optional local file upload inside Editor ────────── */
  const handleFileChange = async e => {
    const file = e.target.files?.[0];
    if (!file || !quill) return;

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res  = await fetch(`${BACKEND_BASE_URL}/api/upload`, {
        method: 'POST',
        body  : fd,
      });
      const data = await res.json();
      data?.text ? quill.setText(data.text)
                 : alert('Could not extract text from that file.');
    } catch (err) {
      console.error(err);
      alert('File upload failed.');
    }
  };

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-6 px-4">
      <h2 className="text-2xl font-bold text-orange-600 mb-4">
        Live&nbsp;Collaborative&nbsp;Editor
      </h2>

      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="mb-4"
      />

      <div className="w-full max-w-4xl">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          className="bg-white border rounded-md shadow"
        />
      </div>
    </div>
  );
}
