import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import Home from './components/Home'
import FormList from './components/FormList'

function App() {
  const [forms, setForms] = useState([]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home forms={forms} setForms={setForms} />} />
        <Route path="/formList" element={<FormList forms={forms} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
