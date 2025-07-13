import React, { useState } from 'react';

function FileUpload({ onTextExtracted }) {
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    setError(null);

    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setFileName(file.name);

    try {
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Server error:', data);
        throw new Error(data.message || 'Upload failed');
      }

      if (data.text) {
        onTextExtracted(data.text);
      } else {
        throw new Error('No text extracted from file.');
      }
    } catch (err) {
      console.error('Upload error:', err.message);
      setError(err.message || 'Upload failed');
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ fontWeight: 'bold' }}>Choose File: </label>
      <input
        type="file"
        onChange={handleUpload}
        accept=".txt,.doc,.docx,.pdf"
        style={{ marginRight: '10px' }}
      />
      {fileName && <div>📄 {fileName}</div>}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
    </div>
  );
}

export default FileUpload;
