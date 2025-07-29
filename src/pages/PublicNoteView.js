import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify'; // For notifications

// Ensure REACT_APP_API_URL is set in your .env file in the frontend root
// Example .env: REACT_APP_API_URL=http://localhost:5000
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PublicNoteView = () => {
    // Get the unique shareId from the URL parameters
    const { shareId } = useParams();

    // State variables for managing note data, loading status, and errors
    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // useEffect hook to fetch the public note data when the component mounts or shareId changes
    useEffect(() => {
        const fetchPublicNote = async () => {
            // Reset loading and error states before fetching
            setLoading(true);
            setError(null);

            try {
                if (!shareId) {
                    // If shareId is missing from the URL, set an error and stop loading
                    setError('Share ID is missing from the URL. Please ensure you have a valid link.');
                    toast.error('Share ID is missing from the URL.');
                    setLoading(false);
                    return; // Exit early
                }

                // Make an unauthenticated GET request to the public backend endpoint
                // This endpoint should return only public fields of the note
                const res = await axios.get(`${API_URL}/api/public-notes/${shareId}`);
                setNote(res.data); // Set the fetched note data to state
                setLoading(false); // Set loading to false once data is fetched

            } catch (err) {
                // Log the full error for debugging purposes
                console.error('Error fetching public note:', err);

                setLoading(false); // Stop loading regardless of error type

                // Handle different error responses from the backend
                if (err.response) {
                    // Server responded with a status other than 2xx
                    if (err.response.status === 404) {
                        setError('Note not found or not public. It might have been deleted or sharing disabled.');
                        toast.error('Note not found or not public.');
                    } else if (err.response.data && err.response.data.message) {
                        setError(`Error: ${err.response.data.message}`);
                        toast.error(`Error: ${err.response.data.message}`);
                    } else {
                        setError('Failed to load note. A server error occurred.');
                        toast.error('Failed to load note. Server error.');
                    }
                } else if (err.request) {
                    // Request was made but no response was received (e.g., network error)
                    setError('Network error. Please check your internet connection or server availability.');
                    toast.error('Network error. Could not connect to the server.');
                } else {
                    // Something else happened while setting up the request
                    setError('An unexpected error occurred while processing the request.');
                    toast.error('An unexpected error occurred.');
                }
            }
        };

        fetchPublicNote(); // Call the fetch function when the component mounts or shareId changes
    }, [shareId]); // Dependency array: re-run useEffect if shareId changes

    // --- Conditional Rendering based on Load/Error State ---

    if (loading) {
        return (
            <div className="public-note-container">
                <p>Loading note...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="public-note-container error-message">
                <h2>Error Loading Note</h2>
                <p>{error}</p>
                <p>Please check the link or try again later.</p>
            </div>
        );
    }

    if (!note) {
        // This case should ideally be covered by `error` state if `shareId` is missing
        // or 404 from API, but as a fallback.
        return (
            <div className="public-note-container">
                <p>No note data available.</p>
            </div>
        );
    }

    // --- Render the Public Note ---
    return (
        <div className="public-note-container">
            <div className="public-note-card">
                <h1 className="public-note-title">{note.title || 'Untitled Note'}</h1> {/* Provide a fallback for title */}

                {/* Render content, handling potential null/undefined content gracefully */}
                {note.content ? (
                    <div
                        className="public-note-content"
                        dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                ) : (
                    <p className="public-note-content-empty">No content for this note.</p>
                )}

                {/* Render tags if available and not empty */}
                {note.tags && Array.isArray(note.tags) && note.tags.length > 0 && (
                    <div className="public-note-tags">
                        {note.tags.map((tag, index) => (
                            <span key={index} className="tag-badge">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Render media if mediaPath exists */}
                {note.mediaPath && (
                    <div className="public-note-media">
                        {note.mediaType === 'image' && (
                            <img src={note.mediaPath} alt="Note media" className="media-image" />
                        )}
                        {note.mediaType === 'video' && (
                            <video controls src={note.mediaPath} className="media-video" />
                        )}
                        {note.mediaType === 'application' && ( // Assuming application is PDF
                            <iframe
                                src={note.mediaPath}
                                title="PDF Document"
                                className="media-pdf"
                                style={{ width: '100%', height: '500px', border: 'none' }}
                            >
                                <p>Your browser does not support iframes. You can <a href={note.mediaPath} target="_blank" rel="noopener noreferrer">download the PDF here</a>.</p>
                            </iframe>
                        )}
                        {/* Add a fallback for unknown media types if necessary */}
                    </div>
                )}

                <div className="public-note-footer">
                    <span className="public-note-date">
                        Created: {new Date(note.createdAt).toLocaleString()}
                    </span>
                    {note.updatedAt && note.createdAt !== note.updatedAt && (
                        <span className="public-note-date">
                            Last Updated: {new Date(note.updatedAt).toLocaleString()}
                        </span>
                    )}
                </div>
            </div>
            <div className="public-note-footer-message">
                <p>This is a public note shared via StickyScribbles. Keep your thoughts organized!</p>
            </div>
        </div>
    );
};

export default PublicNoteView;