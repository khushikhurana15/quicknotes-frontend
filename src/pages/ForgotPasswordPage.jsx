import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function NotesPage({ toggleTheme }) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/notes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotes(res.data);
      } catch (err) {
        console.error(err);
        navigate('/login');
      }
    };
    fetchNotes();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const filteredNotes = notes
    .filter(note =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) =>
      sortBy === 'newest'
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt)
    );

  return (
    <div className="notes-page">
      {/* ✅ TOP CONTROL BAR */}
      <div className="top-controls">
        <input
          type="text"
          placeholder="🔍 Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="newest">📂 Newest First</option>
          <option value="oldest">🕓 Oldest First</option>
        </select>

        <button className="btn-theme" onClick={toggleTheme}>🌓</button>
        <button className="btn-logout" onClick={handleLogout}>🔒</button>
      </div>

      {}
      <div className="notes-container">
        {filteredNotes.map(note => (
          <div key={note._id} className="note">
            <h3>{note.title}</h3>
            <p>{note.content}</p>
            <p><small>Created: {new Date(note.createdAt).toLocaleString()}</small></p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotesPage;
