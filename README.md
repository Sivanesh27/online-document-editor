# Online Document Editor
<img width="942" height="613" alt="image" src="https://github.com/user-attachments/assets/156c9b1e-5493-4d95-89a2-6e1592486e8f" />


A full-stack collaborative online document editor that allows users to create, edit, and download rich text documents. Supports real-time editing, PDF/Word exports, and cloud-based storage using MongoDB. Built with React, Quill.js, Express.js, and Socket.IO.

🔗 **Live Website**: [https://online-document-editor-frontend-8ywc.onrender.com](https://online-document-editor-frontend-8ywc.onrender.com)

---

## Features

- **Rich Text Editing** with [React Quill](https://github.com/zenoamaro/react-quill)
- **Real-time Collaboration** via WebSockets (Socket.IO)
- **Export Documents** as PDF or Word (.docx)
- **Backend** with Node.js, Express, and MongoDB
- **File Uploads** (PDF, DOCX) with `multer` & `mammoth`
- **Cross-Origin Resource Sharing** enabled
- Save & Load documents to/from MongoDB
- Convert content to images using `html2canvas` and `jspdf`

## Tech Stack

| Frontend         | Backend           | Utilities        |
|------------------|-------------------|------------------|
| React 18         | Node.js + Express | html2canvas      |
| React Quill 2.0  | MongoDB           | jsPDF, mammoth   |
| Tailwind CSS     | Socket.IO         | dotenv, multer   |
| React Router DOM | CORS              | file-saver       |

## Installation

```bash
git clone https://github.com/Sivanesh27/online-document-editor.git
cd online-document-editor
npm install

cd client
npm install

