import React, { useState } from 'react';
import { FaFileAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const BACKEND_UPLOAD_URL = 'https://doc-editor-backend.onrender.com/api/upload';

export default function Home() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(BACKEND_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data?.text) {
        navigate('/editor', { state: { initialContent: data.text } });
      } else {
        alert('Failed to extract content from the file.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('File upload failed.');
    }
  };

  return (
    <div className="home-container">
      {/* Header */}
      <h1 className="text-3xl font-bold text-orange-600 mb-2">
        REAL-TIME COLLABORATIVE DOCUMENT EDITOR
      </h1>
      <p className="mb-6 text-gray-700">EDIT DOCUMENTS HERE</p>

      {/* Instructions Box */}
      <div className="instructions-box bg-orange-100 p-4 rounded-md shadow mb-6 max-w-3xl">
        <h3 className="text-lg font-semibold mb-2">INSTRUCTIONS:</h3>
        <ul className="list-disc list-inside text-sm text-gray-800">
          <li>
            Uses frameworks like <span className="font-medium text-orange-600">React.js</span> for a dynamic UI.
          </li>
          <li>
            Backend powered by <span className="font-medium text-orange-600">Node.js</span> and optionally Python frameworks.
          </li>
          <li>
            Stores documents using <span className="font-medium text-orange-600">MongoDB</span>.
          </li>
        </ul>
      </div>

      {/* File Upload Section */}
      <div className="file-box flex flex-col items-center gap-3 p-4 bg-white border rounded shadow max-w-md w-full">
        <label htmlFor="file" className="font-medium">Choose File:</label>
        <input
          type="file"
          accept=".txt,.doc,.docx,.pdf"
          onChange={handleFileChange}
        />

        {fileName && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <FaFileAlt className="text-orange-500" />
            <span>{fileName}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          className="mt-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          UPLOAD
        </button>
      </div>
    </div>
  );
}
