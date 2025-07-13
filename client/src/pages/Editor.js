import 'react-quill/dist/quill.snow.css';
import React, { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import { io } from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

/* ── constants ───────────────────────────────────────────── */
const SAVE_INTERVAL_MS = 2000;
const BACKEND_BASE_URL = 'https://document-editor-backend.onrender.com';
const SOCKET_PATH = '/socket.io';
const DOCUMENT_ID = 'global-doc';

/* ─────────────────────────────────────────────────────────── */
export default function Editor() {
  const [socket, setSocket] = useState(null);
  const [quill, setQuill] = useState(null);
  const quillRef = useRef();

  const location = useLocation();
  const initialContent = location.state?.initialContent || '';

  useEffect(() => {
    const s = io(BACKEND_BASE_URL, {
      path: SOCKET_PATH,
      transports: ['websocket'],
    });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (!socket || !quill) return;

    socket.once('load-document', (serverContent) => {
      quill.setContents(serverContent || '');
      if (initialContent) quill.setText(initialContent);
      quill.enable();
    });

    socket.emit('get-document', DOCUMENT_ID);
  }, [socket, quill, initialContent]);

  useEffect(() => {
    if (!socket || !quill) return;

    const handler = (delta, _oldDelta, source) => {
      if (source !== 'user') return;
      socket.emit('send-changes', { docId: DOCUMENT_ID, delta });
    };

    quill.on('text-change', handler);
    return () => quill.off('text-change', handler);
  }, [socket, quill]);

  useEffect(() => {
    if (!socket || !quill) return;

    const handler = (delta) => {
      quill.updateContents(delta);
    };

    socket.on('receive-changes', handler);
    return () => socket.off('receive-changes', handler);
  }, [socket, quill]);

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

  useEffect(() => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();
    editor.disable();
    editor.setText('Loading...');
    setQuill(editor);
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !quill) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/upload`, {
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
      console.error('❌ Upload failed:', err);
      alert('File upload failed. Try a .txt, .pdf, or .docx file.');
    }
  };

  const handleDownloadTxt = () => {
    const text = quill.getText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'document.txt');
  };

  const handleDownloadPdf = async () => {
    const editorElement = document.querySelector('.ql-editor');
    const canvas = await html2canvas(editorElement);
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF();
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save('document.pdf');
  };

  const handleDownloadDocx = async () => {
    const text = quill.getText();
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [new Paragraph({ children: [new TextRun(text)] })],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'document.docx');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-6 px-4">
      <h2 className="text-2xl font-bold text-orange-600 mb-4">
        Live Collaborative Editor
      </h2>

      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="mb-4"
      />

      <div className="flex gap-3 mb-4">
        <button
          onClick={handleDownloadTxt}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Download TXT
        </button>
        <button
          onClick={handleDownloadPdf}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Download PDF
        </button>
        <button
          onClick={handleDownloadDocx}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Download DOCX
        </button>
      </div>

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

