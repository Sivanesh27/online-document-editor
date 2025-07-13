import 'react-quill/dist/quill.snow.css';

import React, { useEffect, useRef, useState } from 'react';

import ReactQuill from 'react-quill';
import { io } from 'socket.io-client';
import { useLocation } from 'react-router-dom';

const SAVE_INTERVAL_MS = 2000;
const SOCKET_SERVER_URL = 'https://doc-editor-backend.onrender.com';
const DOCUMENT_ID = 'global-doc';

export default function Editor() {
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();
  const quillRef = useRef();
  const location = useLocation();
  const initialContent = location.state?.initialContent || null;

  // Connect to socket
  useEffect(() => {
    const s = io(SOCKET_SERVER_URL);
    setSocket(s);
    return () => s.disconnect();
  }, []);

  // Load document from backend and/or from file
  useEffect(() => {
    if (!socket || !quill) return;

    socket.once('load-document', (serverContent) => {
      const contentToLoad = initialContent
        ? initialContent
        : serverContent;
      quill.setText(contentToLoad);
      quill.enable();
    });

    socket.emit('get-document', DOCUMENT_ID);
  }, [socket, quill, initialContent]);

  // Send changes
  useEffect(() => {
    if (!socket || !quill) return;

    const handler = (delta, oldDelta, source) => {
      if (source !== 'user') return;
      socket.emit('send-changes', { docId: DOCUMENT_ID, delta });
    };

    quill.on('text-change', handler);
    return () => quill.off('text-change', handler);
  }, [socket, quill]);

  // Receive changes
  useEffect(() => {
    if (!socket || !quill) return;

    const handler = (delta) => {
      quill.updateContents(delta);
    };

    socket.on('receive-changes', handler);
    return () => socket.off('receive-changes', handler);
  }, [socket, quill]);

  // Auto save
  useEffect(() => {
    if (!socket || !quill) return;

    const interval = setInterval(() => {
      socket.emit('save-document', {
        docId: DOCUMENT_ID,
        content: quill.getContents(),
      });
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [socket, quill]);

  // Setup editor
  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.disable();
      editor.setText('Loading...');
      setQuill(editor);
    }
  }, []);

  // Optional file upload handler inside Editor
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile || !quill) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('https://online-document-editor-backend-xyz.onrender.com/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data?.text) {
        quill.setText(data.text);
      } else {
        alert('Could not extract text from this file.');
      }
    } catch (err) {
      console.error(err);
      alert('File upload failed.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start py-6 px-4">
      <h2 className="text-2xl font-semibold text-orange-600 mb-4">
        Live Collaborative Editor
      </h2>

      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="mb-4"
      />

      <div className="w-full max-w-4xl">
        <ReactQuill
          theme="snow"
          ref={quillRef}
          className="bg-white border rounded-md shadow-sm"
        />
      </div>
    </div>
  );
}
