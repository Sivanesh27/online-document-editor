import 'react-quill/dist/quill.snow.css';

import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import Editor from './pages/Editor';
import Home from './pages/Home';
import React from 'react';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;



