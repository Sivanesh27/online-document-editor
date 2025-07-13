/* eslint-disable */

const express    = require('express');
const http       = require('http');
const mongoose   = require('mongoose');
const { Server } = require('socket.io');
const multer     = require('multer');
const mammoth    = require('mammoth');
const pdfParse   = require('pdf-parse');
const path       = require('path');
const fs         = require('fs');
const fsPromises = require('fs/promises');
const cors       = require('cors');
require('dotenv').config();

// ───────────────────────────────────────────────────────────
//  Express & Server Setup
// ───────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// ───────────────────────────────────────────────────────────
//  MongoDB Setup
// ───────────────────────────────────────────────────────────
if (!process.env.MONGO_URI) {
  console.error('❌  MONGO_URI not found in .env');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅  MongoDB connected'))
  .catch((err) => {
    console.error('❌  MongoDB connection error:', err);
    process.exit(1);
  });

const DocumentSchema = new mongoose.Schema({
  _id: String, // Use _id as document ID
  title: String,
  content: Object,
  updatedAt: { type: Date, default: Date.now },
});
const Document = mongoose.model('Document', DocumentSchema);

// ───────────────────────────────────────────────────────────
//  Ensure uploads folder exists & serve it statically
// ───────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// ───────────────────────────────────────────────────────────
//  File‑upload endpoint  /api/upload
// ───────────────────────────────────────────────────────────
const upload = multer({ dest: uploadsDir });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = path.extname(file.originalname).toLowerCase();
  let text = '';

  try {
    const data = await fsPromises.readFile(file.path);

    if (ext === '.txt') {
      text = data.toString();
    } else if (ext === '.docx' || ext === '.doc') {
      const out = await mammoth.extractRawText({ path: file.path });
      text = out.value;
    } else if (ext === '.pdf') {
      const out = await pdfParse(data);
      text = out.text;
    } else {
      return res.status(415).json({ error: 'Unsupported file type' });
    }

    res.json({ text, filename: file.filename, url: `/uploads/${file.filename}` });
  } catch (err) {
    console.error('File-parse error:', err);
    res.status(500).json({ error: 'Failed to parse file' });
  }
});

// ───────────────────────────────────────────────────────────
//  REST  /api/doc   save / load
// ───────────────────────────────────────────────────────────
app.post('/api/doc', async (req, res) => {
  try {
    const { title, content } = req.body;
    const doc = await Document.create({ title, content });
    res.json(doc);
  } catch {
    res.status(500).json({ error: 'Failed to create document' });
  }
});

app.get('/api/doc/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch {
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
});

// ───────────────────────────────────────────────────────────
//  Helper to Find or Create Document
// ───────────────────────────────────────────────────────────
async function findOrCreateDocument(id) {
  if (id == null) return null;
  const doc = await Document.findById(id);
  if (doc) return doc;
  return await Document.create({ _id: id, title: 'Untitled', content: '' });
}

// ───────────────────────────────────────────────────────────
//  Socket.io Real-Time Editor
// ───────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('⚡ Client connected:', socket.id);

  socket.on('get-document', async (docId) => {
    const document = await findOrCreateDocument(docId);
    socket.join(docId);
    socket.emit('load-document', document.content);
    console.log(`📄 ${socket.id} loaded document ${docId}`);

    socket.on('send-changes', (delta) => {
      socket.broadcast.to(docId).emit('receive-changes', delta);
    });

    socket.on('save-document', async (data) => {
      await Document.findByIdAndUpdate(docId, {
        content: data,
        updatedAt: Date.now(),
      });
    });
  });

  socket.on('disconnect', () => {
    console.log(`✖️  ${socket.id} disconnected`);
  });
});

// ───────────────────────────────────────────────────────────
//  Start Server
// ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Backend on http://localhost:${PORT}`));
