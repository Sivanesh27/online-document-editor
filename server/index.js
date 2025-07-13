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

// ─────────────────────────────────────────
//  Express App and HTTP Server
// ─────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────
//  MongoDB Setup
// ─────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI missing from .env');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const DocumentSchema = new mongoose.Schema({
  _id: String,
  title: String,
  content: Object,
  updatedAt: { type: Date, default: Date.now },
});
const Document = mongoose.model('Document', DocumentSchema);

// ─────────────────────────────────────────
//  File Uploads - Setup
// ─────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

const upload = multer({ dest: uploadsDir });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  const file = req.file;

  if (!file) {
    console.error('❌ No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  let text = '';

  try {
    const data = await fsPromises.readFile(file.path);
    console.log(`📥 Uploaded file: ${file.originalname} (${ext})`);

    if (ext === '.txt') {
      text = data.toString();
    } else if (ext === '.docx' || ext === '.doc') {
      const out = await mammoth.extractRawText({ path: file.path });
      text = out.value;
    } else if (ext === '.pdf') {
      const out = await pdfParse(data);
      text = out.text;
    } else {
      console.error('❌ Unsupported file type:', ext);
      return res.status(415).json({ error: 'Unsupported file type' });
    }

    return res.json({
      text,
      filename: file.originalname,
      path: `/uploads/${file.filename}`,
    });
  } catch (err) {
    console.error('❌ Error parsing uploaded file:', err);
    return res.status(500).json({ error: 'Failed to parse uploaded file' });
  }
});

// ─────────────────────────────────────────
//  REST API for Document Create/Retrieve
// ─────────────────────────────────────────
app.post('/api/doc', async (req, res) => {
  try {
    const { title, content } = req.body;
    const doc = await Document.create({ title, content });
    res.json(doc);
  } catch (err) {
    console.error('❌ Error creating doc:', err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

app.get('/api/doc/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    console.error('❌ Error retrieving doc:', err);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// ─────────────────────────────────────────
//  Socket.IO Collaboration Logic
// ─────────────────────────────────────────
async function findOrCreateDocument(id) {
  if (id == null) return;
  let doc = await Document.findById(id);
  if (!doc) {
    doc = await Document.create({ _id: id, title: 'Untitled', content: '' });
  }
  return doc;
}

io.on('connection', (socket) => {
  console.log('⚡ Client connected:', socket.id);

  socket.on('get-document', async (docId) => {
    const document = await findOrCreateDocument(docId);
    socket.join(docId);
    socket.emit('load-document', document.content);

    socket.on('send-changes', ({ docId, delta }) => {
      socket.broadcast.to(docId).emit('receive-changes', delta);
    });

    socket.on('save-document', async ({ docId, content }) => {
      await Document.findByIdAndUpdate(docId, {
        content,
        updatedAt: new Date(),
      });
    });
  });

  socket.on('disconnect', () => {
    console.log(`✖ Client disconnected: ${socket.id}`);
  });
});

// ─────────────────────────────────────────
//  Start Server
// ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
