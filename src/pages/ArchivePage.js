// src/pages/ArchivePage.js
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import NoteCard from "../components/NoteCard";
import Pagination from "../components/Pagination"; // Assuming you want pagination for archive page too
import './ArchivePage.css'; // Create this CSS file for specific styling

// Get API URL from environment variables
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'; // Added fallback for safety

// Helper function to safely parse potentially double-stringified tags (copied from NotePage)
const safelyParseTags = (tags) => {
    let parsedTags = tags;

    while (typeof parsedTags === 'string' && parsedTags.startsWith('[') && parsedTags.endsWith(']')) {
        try {
            const tempParsed = JSON.parse(parsedTags);
            if (typeof tempParsed === 'string' && tempParsed.startsWith('[') && tempParsed.endsWith(']')) {
                parsedTags = tempParsed;
            } else if (Array.isArray(tempParsed)) {
                parsedTags = tempParsed;
                break;
            } else {
                console.warn("safelyParseTags: Unexpected content after parsing. Original input:", tags, "Parsed intermediate:", tempParsed);
                parsedTags = [String(tempParsed)];
                break;
            }
        } catch (e) {
            console.error("safelyParseTags: Failed to parse tags string (JSON.parse error):", parsedTags, e);
            parsedTags = [];
            break;
        }
    }

    if (!Array.isArray(parsedTags)) {
        console.warn("safelyParseTags: Final result is not an array. Original input:", tags, "Final result:", parsedTags);
        parsedTags = typeof parsedTags === 'string' && parsedTags.trim() !== '' ? [parsedTags.trim()] : [];
    }

    return parsedTags.map(tag => typeof tag === 'string' ? tag.trim() : String(tag)).filter(tag => tag !== '');
};


const ArchivePage = () => {
  const [archivedNotes, setArchivedNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const notesPerPage = 5; // Same as NotePage for consistency

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDeleteId, setNoteToDeleteId] = useState(null);

  const navigate = useNavigate();

  // Modified: Function to fetch archived notes - now explicitly requests archived notes
  const fetchArchivedNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        toast.error("Session expired. Please log in again.");
        return;
      }

      // *** IMPORTANT CHANGE HERE ***
      // Call the API with showArchived=true to explicitly get only archived notes
      const response = await axios.get(`${API_URL}/api/notes?showArchived=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("ArchivePage - Raw API Response Data:", response.data);

      // Now the filter is largely redundant if the backend query param works, but harmless to keep.
      // Filter notes to only include those that are archived (if showArchived=true works, this will just confirm)
      const fetchedArchivedNotes = (response.data || [])
        .filter(note => {
          console.log(`ArchivePage - Filtering: Note ID ${note._id}, isArchived: ${note.isArchived}`);
          return note.isArchived; // Keep this check for robustness
        })
        .map(note => ({
            ...note,
            tags: safelyParseTags(note.tags) // Apply tag parsing
        }));

      console.log("ArchivePage - Filtered Notes for Display:", fetchedArchivedNotes);

      // Sort archived notes (e.g., by newest archived first)
      const sortedArchivedNotes = [...fetchedArchivedNotes].sort((a, b) => {
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt); // Sort by last updated or created
      });

      setArchivedNotes(sortedArchivedNotes);
    } catch (err) {
      console.error("Error fetching archived notes:", err);
      if (err.response && err.response.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
      toast.error("Failed to load archived notes.");
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchArchivedNotes();
  }, [fetchArchivedNotes]);


  // Modified: Function to handle restoring a note (unarchiving) - now uses dedicated backend route
  const handleRestoreNote = useCallback(async (noteId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      toast.error("Session expired. Please log in again.");
      return;
    }

    try {
      // *** IMPORTANT CHANGE HERE ***
      // Call the new dedicated restore endpoint: /api/notes/:id/restore
      await axios.put(
        `${API_URL}/api/notes/${noteId}/restore`, // Corrected URL
        {}, // No payload needed, the backend 'restoreNote' controller handles setting isArchived: false
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove the restored note from the archived list in the UI
      setArchivedNotes((prevNotes) => (
        Array.isArray(prevNotes) ? prevNotes.filter((note) => note._id !== noteId) : []
      ));
      toast.success("Note restored successfully!");
    } catch (error) {
      console.error("Error restoring note:", error.response?.data || error.message);
      if (error.response && error.response.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        toast.error("Failed to restore note. Please try again.");
      }
    }
  }, [navigate]);

  // Function to trigger permanent delete confirmation modal
  const handleDeletePermanentlyClick = useCallback((noteId) => {
    setNoteToDeleteId(noteId);
    setShowDeleteConfirm(true);
  }, []);

  // Modified: Function to handle permanent deletion after confirmation - now uses dedicated backend route
  const confirmDeletePermanently = async () => {
    if (!noteToDeleteId) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      toast.error("Session expired. Please log in again.");
      cancelDelete(); // Close modal
      return;
    }

    try {
      // *** IMPORTANT CHANGE HERE ***
      // Call the new dedicated permanent delete endpoint: /api/notes/:id/permanently
      await axios.delete(`${API_URL}/api/notes/${noteToDeleteId}/permanently`, { // Corrected URL
        headers: { Authorization: `Bearer ${token}` },
      });
      // Remove the permanently deleted note from the archived list in the UI
      setArchivedNotes((prevNotes) => (
        Array.isArray(prevNotes) ? prevNotes.filter((note) => note._id !== noteToDeleteId) : []
      ));
      toast.success("Note permanently deleted.");
    } catch (err) {
      console.error("Error deleting note permanently:", err);
      if (err.response && err.response.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
      toast.error("Failed to permanently delete note.");
    } finally {
      cancelDelete(); // Always close the modal
    }
  };

  const cancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setNoteToDeleteId(null);
  }, []);

  const indexOfLastNote = currentPage * notesPerPage;
  const indexOfFirstNote = indexOfLastNote - notesPerPage;
  const currentArchivedNotes = Array.isArray(archivedNotes) ? archivedNotes.slice(indexOfFirstNote, indexOfLastNote) : [];

  return (
    <div className="archive-page-container">
      <header className="page-header">
        <div className="brand-section">
          <img src="./logo.png" alt="QuickNotes Logo" className="logo" />
          <h2 className="app-title">Archived</h2>
        </div>
        <div className="header-actions">
          <button className="button secondary" onClick={() => navigate('/notes')}>
            Back to All Notes
          </button>
        </div>
      </header>

      <main className="main-content">
        {isLoading ? (
          <div className="loading-message-container">
            <div className="spinner"></div>
            <p>Loading archived notes...</p>
          </div>
        ) : (
          <>
            {archivedNotes.length === 0 ? (
              <p className="no-notes-message">No notes in archive yet.</p>
            ) : (
              <section className="note-list-section">
                <div className="notes-list">
                  {currentArchivedNotes.map((note) => (
                    <NoteCard
                      key={note._id}
                      note={note}
                      isArchivedView={true} // IMPORTANT: Tell NoteCard it's in archive view
                      onRestore={handleRestoreNote} // Pass restore handler
                      onDeletePermanently={handleDeletePermanentlyClick} // Pass permanent delete handler
                      // onDelete and onArchive are NOT passed from ArchivePage
                    />
                  ))}
                </div>
              </section>
            )}

            {archivedNotes.length > notesPerPage && (
              <Pagination
                totalNotes={archivedNotes.length}
                notesPerPage={notesPerPage}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            )}
          </>
        )}
      </main>

      {/* Permanent Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Permanent Deletion</h3>
            <p>Are you sure you want to permanently delete this note? This action cannot be undone and the note will be lost forever.</p>
            <div className="modal-actions">
              <button className="button danger" onClick={confirmDeletePermanently}>
                Delete Permanently
              </button>
              <button className="button secondary" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivePage;