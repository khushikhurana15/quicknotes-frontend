import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import ShareModal from './ShareModal';
import { FaThumbtack, FaPlay, FaStop, FaFolderOpen, FaUndo, FaShareAlt } from 'react-icons/fa';
import { MdEdit, MdDelete } from "react-icons/md";
import { IoCloseCircleOutline } from "react-icons/io5";

import EditorWrapper from './EditorWrapper';
import MediaViewerModal from './MediaViewerModal';

// NEW: Import Document and Page from react-pdf for in-card PDF display
import { Document, Page, pdfjs } from 'react-pdf';
// Essential for proper PDF rendering and styling:
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Define BACKEND_URL. This should match your backend server URL.
// IMPORTANT: Keep API_URL for other API calls, but not for media URLs from Cloudinary.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// *** CRITICAL FIX FOR PDF.JS VERSION MISMATCH & Worker Import Error ***
// Set the workerSrc ONCE, centrally, for all instances of react-pdf.
// We use unpkg.com to reliably load the worker that matches the pdfjs-dist
// version installed with react-pdf. pdfjs.version ensures the version match.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
// *** END CRITICAL FIX ***

// Helper function to strip HTML tags and get plain text
const getPlainTextFromHtml = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

const NoteCard = ({
  note,
  onDelete,
  onNoteUpdated,
  onTogglePin,
  isArchivedView = false,
  onArchive,
  onRestore,
  onDeletePermanently
}) => {
  // === MODIFICATION 1: currentMediaUrl should be the direct URL ===
  const currentMediaUrl = note.mediaPath; // note.mediaPath should now be the full Cloudinary URL
  const currentMediaType = note.mediaType;

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(note.title);
  const [editedContent, setEditedContent] = useState(note.content);
  const [editedTagsInput, setEditedTagsInput] = useState(
    Array.isArray(note.tags) ? note.tags.join(', ') : ''
  );
  const [editedMediaFile, setEditedMediaFile] = useState(null);
  // === MODIFICATION 2: editedMediaPreview should use currentMediaUrl directly ===
  const [editedMediaPreview, setEditedMediaPreview] = useState(
    currentMediaUrl ? currentMediaUrl : null // Remove API_URL concatenation
  );
  const [editedMediaType, setEditedMediaType] = useState(currentMediaType);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // State for in-card PDF rendering (react-pdf specific)
  const [inCardPdfNumPages, setInCardPdfNumPages] = useState(null);

  // State for MediaViewerModal
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentMediaInViewer, setCurrentMediaInViewer] = useState({ path: null, type: null });

  // State for ShareModal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Functions for MediaViewerModal
  const openMediaViewer = useCallback((path, type) => {
    // === MODIFICATION 3: Path passed to viewer is already absolute ===
    setCurrentMediaInViewer({ path, type });
    setIsViewerOpen(true);
  }, []);

  const closeMediaViewer = useCallback(() => {
    setIsViewerOpen(false);
    setCurrentMediaInViewer({ path: null, type: null });
  }, []);

  // Functions for ShareModal
  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  const handleCloseShareModal = () => {
    setIsShareModalOpen(false);
  };

  // Effect to clean up audio and blob URLs on unmount or note change
  useEffect(() => {
    const currentAudioRef = audioRef.current;
    return () => {
      if (currentAudioRef) {
        currentAudioRef.pause();
        currentAudioRef.src = "";
      }
      if (editedMediaPreview && editedMediaPreview.startsWith('blob:')) {
        URL.revokeObjectURL(editedMediaPreview);
      }
      setIsViewerOpen(false);
      setCurrentMediaInViewer({ path: null, type: null });
      setIsShareModalOpen(false);
    };
  }, [note._id, editedMediaPreview]);

  // Effect to reset form state when the 'note' prop changes
  useEffect(() => {
    setEditedTitle(note.title);
    setEditedContent(note.content);
    setEditedTagsInput(Array.isArray(note.tags) ? note.tags.join(', ') : '');
    // === MODIFICATION 4: Reset editedMediaPreview without API_URL ===
    setEditedMediaPreview(note.mediaPath ? note.mediaPath : null);
    setEditedMediaType(note.mediaType);
    setEditedMediaFile(null);
    setRemoveMedia(false);
    setIsEditing(false); // Ensure editing mode is off when note changes
    setIsViewerOpen(false);
    setCurrentMediaInViewer({ path: null, type: null });
    setIsShareModalOpen(false);
  }, [note]);

  // In-card PDF load success handler
  const onInCardPdfLoadSuccess = useCallback(({ numPages }) => {
    setInCardPdfNumPages(numPages);
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedTitle.trim() || !editedContent.trim() || editedContent === '<p></p>') {
      toast.warning("Title and content cannot be empty.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Session expired. Please log in again.");
      window.location.href = '/login';
      return;
    }

    const formData = new FormData();
    formData.append("title", editedTitle);
    formData.append("content", editedContent);

    const tagsArray = editedTagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    tagsArray.forEach(tag => {
      formData.append("tags", tag);
    });

    if (removeMedia) {
      formData.append("removeMedia", "true");
    }

    if (editedMediaFile) {
      formData.append("media", editedMediaFile); // This 'media' field will be handled by multer/Cloudinary on backend
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      };
      const res = await axios.put(
        `${API_URL}/api/notes/${note._id}`,
        formData,
        config
      );
      setIsEditing(false);
      const updatedNoteWithProcessedTags = {
        ...res.data,
        tags: typeof res.data.tags === 'string' && res.data.tags.startsWith('[') && res.data.tags.endsWith(']')
          ? JSON.parse(res.data.tags)
          : Array.isArray(res.data.tags) ? res.data.tags : []
      };
      // Ensure mediaPath in the updated note is direct Cloudinary URL
      // If your backend correctly sends Cloudinary URL, this is fine.
      onNoteUpdated(updatedNoteWithProcessedTags);
      toast.success("Note updated successfully!");
    } catch (err) {
      console.error("Error updating note:", err);
      toast.error("Failed to update note.");
      if (err.response && err.response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = '/login';
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle(note.title);
    setEditedContent(note.content);
    setEditedTagsInput(Array.isArray(note.tags) ? note.tags.join(', ') : '');
    setEditedMediaFile(null);
    // === MODIFICATION 5: Reset editedMediaPreview on cancel without API_URL ===
    setEditedMediaPreview(currentMediaUrl ? currentMediaUrl : null);
    setEditedMediaType(currentMediaType);
    setRemoveMedia(false);
  };

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditedMediaFile(file);
      setEditedMediaPreview(URL.createObjectURL(file)); // This is for local preview only
      if (file.type.startsWith('image/')) {
        setEditedMediaType('image');
      } else if (file.type.startsWith('video/')) {
        setEditedMediaType('video');
      } else if (file.type === 'application/pdf') {
        setEditedMediaType('application');
      } else {
        setEditedMediaType(null);
      }
      setRemoveMedia(false);
    } else {
      setEditedMediaFile(null);
      // === MODIFICATION 6: Fallback if no new file is chosen, use currentMediaUrl directly ===
      setEditedMediaPreview(currentMediaUrl ? currentMediaUrl : null);
      setEditedMediaType(currentMediaType);
    }
  };

  const handleRemoveMedia = () => {
    setRemoveMedia(true);
    setEditedMediaFile(null);
    setEditedMediaPreview(null);
    setEditedMediaType(null);
  };

  const handlePinToggle = () => {
    if (onTogglePin) {
      onTogglePin(note._id, note.isPinned);
    }
  };

  const handlePlayText = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    const plainTextContent = getPlainTextFromHtml(note.content);
    const textToRead = `${note.title}. ${plainTextContent}`;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Session expired. Please log in again.");
        window.location.href = '/login';
        return;
      }
      const response = await axios.post(
        `${API_URL}/api/notes/text-to-speech`,
        { text: textToRead },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          responseType: "blob",
        }
      );

      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.onerror = (e) => {
          console.error("Audio playback error:", e);
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
          toast.error("Failed to play audio.");
        };
      }
    } catch (error) {
      console.error("Error with text-to-speech:", error.response?.data || error.message);
      setIsPlaying(false);
      toast.error("Failed to convert text to speech.");
    }
  };

  const formattedDate = note.createdAt
    ? new Date(note.createdAt).toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '';

  return (
    <div className={`note-card ${note.isPinned ? 'pinned' : ''}`}>
      {isEditing ? (
        <div className="note-edit-form">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="edit-title-input"
              placeholder="Note Title"
            />
            <EditorWrapper
              initialContent={note.content}
              onContentChange={setEditedContent}
              key={note._id}
            />

            {/* RESTORED: Tags input field */}
            <input
              type="text"
              placeholder="Tags (comma-separated, e.g., work, urgent, idea)"
              value={editedTagsInput}
              onChange={(e) => setEditedTagsInput(e.target.value)}
              className="edit-tags-input"
            />

            <div className="file-input-wrapper">
              <input
                type="file"
                accept="image/*,video/*,application/pdf"
                onChange={handleMediaChange}
                className="hidden-file-input"
                id={`editMediaUpload-${note._id}`}
              />
              <label htmlFor={`editMediaUpload-${note._id}`} className="custom-file-upload-button">
                Choose Media (Image/Video/PDF)
              </label>
              <span className="file-name-display">
                {editedMediaFile ? editedMediaFile.name : (editedMediaPreview ? "Existing file" : "No file chosen")}
              </span>
              {(editedMediaPreview || (currentMediaUrl && !removeMedia)) && (
                <button
                  type="button"
                  className="button danger small"
                  onClick={handleRemoveMedia}
                  title="Remove Media"
                >
                  <IoCloseCircleOutline />
                </button>
              )}
            </div>

            {editedMediaPreview && (
              <div className="edit-media-preview-container">
                {editedMediaType === 'image' && (
                  // === MODIFICATION 7: Image preview from direct URL ===
                  <img src={editedMediaPreview} alt="Media Preview" className="edit-uploaded-media-preview" />
                )}
                {editedMediaType === 'video' && (
                  // === MODIFICATION 8: Video preview from direct URL ===
                  <video controls src={editedMediaPreview} className="edit-uploaded-media-preview" />
                )}
                {editedMediaType === 'application' && (
                  // For editing mode, iframe is simpler/safer for preview
                  // === MODIFICATION 9: PDF iframe preview from direct URL ===
                  <iframe src={editedMediaPreview} title="PDF Preview" className="edit-uploaded-pdf-preview" />
                )}
              </div>
            )}

            <div className="note-card-actions">
              <button className="button primary" onClick={handleSave}>
                Save
              </button>
              <button className="button secondary" onClick={handleCancelEdit}>
                Cancel
              </button>
            </div>
          </div>
      ) : ( // This is the 'else' part for display mode
        <div className="note-display">
          <div className="note-header">
            <div className="note-title-box">
              <h3 className="note-title">{note.title}</h3>
            </div>
            <div className="note-meta-actions">
              <button className="share-button" onClick={handleShareClick} aria-label="Share Note" title="Share Note">
                <FaShareAlt />
              </button>

              <button
                className={`pin-toggle-button ${note.isPinned ? 'unpin' : ''}`}
                onClick={handlePinToggle}
                title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
              >
                <FaThumbtack />
              </button>
            </div>
          </div>

          <div className="note-content-scrollable" dangerouslySetInnerHTML={{ __html: note.content }} />

          {Array.isArray(note.tags) && note.tags.length > 0 && (
            <div className="note-tags">
              {note.tags.map((tag, index) => (
                <span key={index} className="tag-badge">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {note.mediaPath && (
            <div className={`note-media-display-wrapper ${note.mediaType === 'application' ? 'is-pdf' : ''}`}>
              {note.mediaType === 'image' && (
                <img
                  // === MODIFICATION 10: Image display from direct URL ===
                  src={note.mediaPath}
                  alt="Note media"
                  className="note-image"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openMediaViewer(note.mediaPath, note.mediaType)}
                />
              )}
              {note.mediaType === 'video' && (
                <video
                  controls
                  // === MODIFICATION 11: Video display from direct URL ===
                  src={note.mediaPath}
                  className="note-video"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openMediaViewer(note.mediaPath, note.mediaType)}
                />
              )}
              {note.mediaType === 'application' && (
                // Use react-pdf's Document and Page for in-card PDF preview
                <div
                  className="pdf-viewer-content"
                  style={{ width: '100%', height: '300px', overflow: 'hidden', border: '1px solid #eee', position: 'relative' }} // Added basic styling
                >
                  <Document
                    // === MODIFICATION 12: PDF document source from direct URL ===
                    file={note.mediaPath}
                    onLoadSuccess={onInCardPdfLoadSuccess}
                    onLoadError={(error) => {
                      console.error(`Error loading PDF for note ${note.id}:`, error);
                      // === MODIFICATION 13: Handle PDF loading errors gracefully ===
                      // You might want to display a user-friendly message here,
                      // as the 404 error was previously caught here.
                      toast.error("Failed to load PDF preview. It might be missing.");
                    }}
                    loading={<p>Loading PDF preview...</p>}
                    error={<p style={{ color: 'red' }}>Error loading PDF preview.</p>}
                    noData={<p>No PDF data.</p>}
                  >
                    {/* Render only the first page for the in-card preview */}
                    <Page pageNumber={1} width={250} /> {/* Adjust width as needed for your card layout */}
                  </Document>
                  {inCardPdfNumPages && inCardPdfNumPages > 1 && (
                    <div style={{ textAlign: 'center', marginTop: '10px', padding: '5px', backgroundColor: '#f0f0f0', borderTop: '1px solid #ddd' }}>
                      Page 1 of {inCardPdfNumPages}. <a href="#" onClick={(e) => { e.preventDefault(); openMediaViewer(note.mediaPath, note.mediaType); }}>View Full PDF</a>
                    </div>
                  )}
                  {/* Overlay to make the whole PDF area clickable to open viewer */}
                  <div
                    className="pdf-click-overlay"
                    onClick={() => openMediaViewer(note.mediaPath, note.mediaType)}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer', zIndex: 10 }}
                    title="Click to view full PDF"
                  ></div>
                </div>
              )}
            </div>
          )}

          <div className="note-footer">
            <span className="note-date">{formattedDate}</span>
            <div className="note-actions">
              <button onClick={handlePlayText} className="tts-button" title={isPlaying ? "Stop Text-to-Speech" : "Play Text-to-Speech"}>
                {isPlaying ? <FaStop /> : <FaPlay />}
              </button>

              {isArchivedView ? (
                <>
                  <button onClick={() => onRestore(note._id)} className="button primary" title="Restore Note">
                    <FaUndo /> Restore
                  </button>
                  <button onClick={() => onDeletePermanently(note._id)} className="button danger" title="Delete Permanently">
                    <MdDelete /> Delete
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleEdit} className="button edit" title="Edit Note">
                    <MdEdit />
                  </button>
                  {onArchive && (
                    <button onClick={() => onArchive(note._id)} className="button secondary" title="Archive Note">
                      <FaFolderOpen />
                    </button>
                  )}
                  <button onClick={() => onDelete(note._id)} className="button delete" title="Delete Note">
                    <MdDelete />
                  </button>
                </>
              )}
            </div>
          </div>
          <audio ref={audioRef} style={{ display: 'none' }}></audio>
        </div>
      )}

      <MediaViewerModal
        isOpen={isViewerOpen}
        mediaPath={currentMediaInViewer.path} // This path should now be a direct Cloudinary URL
        mediaType={currentMediaInViewer.type}
        onClose={closeMediaViewer}
      />

      <ShareModal
        noteId={note._id}
        isOpen={isShareModalOpen}
        onClose={handleCloseShareModal}
      />
    </div>
  );
};

export default NoteCard;