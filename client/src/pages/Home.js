import React, { useState } from 'react';

import { FaFileAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
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
      const response = await fetch('https://online-document-editor-backend-xyz.onrender.com/api/upload', {
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
      <h1>REAL-TIME COLLABORATIVE DOCUMENT EDITOR</h1>
      <p>EDIT DOCUMENTS HERE</p>

      {/* Instructions Box */}
      <div className="instructions-box">
        <h3>INSTRUCTIONS:</h3>
        <ul>
          <li>
            Uses frameworks like <span className="highlight">React.js</span> for a dynamic and responsive UI.
          </li>
          <li>
            Uses <span className="highlight">Node.js</span>, <span className="highlight">Python (Django/Flask)</span> for backend framework.
          </li>
          <li>
            Uses <span className="highlight">MongoDB</span> for data storage.
          </li>
        </ul>
      </div>

      {/* File Upload Section */}
      <div className="file-box">
        <label htmlFor="file">Choose File:</label><br />
        <input
          type="file"
          accept=".txt,.doc,.docx,.pdf"
          onChange={handleFileChange}
        />

        {fileName && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <FaFileAlt color="#ea580c" />
            <span>{fileName}</span>
          </div>
        )}

        <button onClick={handleSubmit}>UPLOAD</button>
      </div>
    </div>
  );
}
