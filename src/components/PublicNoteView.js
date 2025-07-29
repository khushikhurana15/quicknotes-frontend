// components/PublicNoteView.jsx (or pages/PublicNoteView.jsx)

import React, { useState, useEffect } from 'react';

import { useParams } from 'react-router-dom';

import { toast } from 'react-toastify'; // For user notifications



// Assuming you have a CSS file for this view or global styles

import './PublicNoteView.css'; // Create this file next



// Base URL for your backend API

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const response = await fetch(`${API_URL}/api/public-notes/${shareId}`);

const PublicNoteView = () => {

const { shareId } = useParams(); // Get the shareId from the URL

const [note, setNote] = useState(null);

const [loading, setLoading] = useState(true);

const [error, setError] = useState(null);



useEffect(() => {

const fetchPublicNote = async () => {

if (!shareId) {

setError("Invalid share link.");

setLoading(false);

return;

}



try {

// IMPORTANT: This backend endpoint must be accessible WITHOUT authentication

const response = await fetch(`${API_URL}/api/public-notes/${shareId}`); // Example endpoint



if (response.ok) {

const data = await response.json();

setNote(data);

toast.success("Note loaded successfully!");

} else {

const errorData = await response.json();

const errorMessage = errorData.message || `Failed to load note: ${response.statusText}`;

setError(errorMessage);

toast.error(errorMessage);

}

} catch (err) {

console.error("Network error fetching public note:", err);

setError("Could not connect to the server. Please try again later.");

toast.error("Network error. Could not load note.");

} finally {

setLoading(false);

}

};



fetchPublicNote();

}, [shareId]); // Re-fetch if shareId changes



if (loading) {

return (

<div className="public-note-container loading">

<p>Loading note...</p>

{/* You can add a spinner here */}

</div>

);

}



if (error) {

return (

<div className="public-note-container error">

<h2>Error</h2>

<p>{error}</p>

<p>Please check the link or try again.</p>

</div>

);

}



if (!note) {

return (

<div className="public-note-container not-found">

<h2>Note Not Found</h2>

<p>The note you are looking for does not exist or the link is invalid.</p>

</div>

);

}



// Render the note content

return (

<div className="public-note-container">

<div className="public-note-card">

<h1 className="public-note-title">{note.title || "Untitled Note"}</h1>

<div className="public-note-content" dangerouslySetInnerHTML={{ __html: note.content }} />

{/* Displaying timestamp or other metadata if available */}

{note.createdAt && (

<p className="public-note-meta">Created on: {new Date(note.createdAt).toLocaleDateString()}</p>

)}

</div>

</div>

);

};



export default PublicNoteView;