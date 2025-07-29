import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./NotePage.css";
import NoteCard from "../components/NoteCard";
import Pagination from "../components/Pagination";
import { useNavigate } from "react-router-dom";
import EmojiPicker from 'emoji-picker-react';
import { BsEmojiSmileFill } from 'react-icons/bs';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import EditorWrapper from '../components/EditorWrapper'; // UNCOMMENTED
import db from '../db';

// Get API URL from environment variables
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Helper function to safely parse potentially double-stringified tags
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


const NotePage = ({ toggleTheme, currentTheme }) => {
    const [notes, setNotes] = useState([]);
    const [filteredNotes, setFilteredNotes] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState("newest");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState('<p></p>'); // Still need content state even if editor is hidden
    const [tagsInput, setTagsInput] = useState("");
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaFilePreview] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const notesPerPage = 5;
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [currentSpeechTarget, setCurrentSpeechTarget] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [noteToDeleteId, setNoteToDeleteId] = useState(null);
    const debounceTimeoutRef = useRef(null);
    const [editorKey, setEditorKey] = useState(0); // Still keep this, just in case

    const navigate = useNavigate();

    const initialLoadHandled = useRef(false);
    const notesLoadedToastId = useRef('notesLoadedToastId');

    const editorRef = useRef(null); // UNCOMMENTED
    const stableSetEditorRef = useCallback((editorInstance) => { // UNCOMMENTED
     editorRef.current = editorInstance; // UNCOMMENTED
    }, []); // UNCOMMENTED

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    useEffect(() => {
        if (recognition) {
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (currentSpeechTarget === 'title') {
                    setTitle((prevTitle) => prevTitle + transcript);
                } else if (currentSpeechTarget === 'content') {
                     if (editorRef.current) { // UNCOMMENTED
                       editorRef.current.chain().focus().insertContent(transcript).run(); // UNCOMMENTED
                     } else { // UNCOMMENTED
                    setContent((prevContent) => prevContent + transcript);
                     } // UNCOMMENTED
                }
                setIsListening(false);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
                toast.error(`Speech recognition error: ${event.error}. Please ensure your microphone is connected and access is granted.`);
            };

            recognition.onend = () => {
                setIsListening(false);
            };
        }
    }, [recognition, currentSpeechTarget]);

    const startListening = (target) => {
        if (!recognition) {
            toast.error("Speech recognition is not supported in your browser. Please use Chrome or Edge.");
            return;
        }
        setCurrentSpeechTarget(target);
        setIsListening(true);
        recognition.start();
    };

    const stopListening = () => {
        if (recognition) {
            recognition.stop();
            setIsListening(false);
        }
    };

    const sortNotes = useCallback((notesArray, currentSortOrder) => {
        if (!Array.isArray(notesArray)) return [];
        return [...notesArray].sort((a, b) => {
            if (a.isPinned !== b.isPinned) {
                return b.isPinned ? -1 : 1;
            }
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return currentSortOrder === "newest" ? dateB - dateA : dateA - dateB;
        });
    }, []);

    const fetchNotesData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const showArchived = 'false';

        try {
            const token = localStorage.getItem("token");

            if (!token) {
                const cachedNotes = await db.notes.where({ isArchived: showArchived === 'true' }).toArray();
                if (cachedNotes.length > 0) {
                    setNotes(cachedNotes.map(note => ({
                        ...note,
                        _id: note.backendId
                    })));
                    toast.info("Showing cached notes (no token, offline mode)", { toastId: 'cachedNotesInfo' });
                } else {
                    navigate("/login");
                    setNotes([]);
                    toast.error("No token found. Please log in.");
                }
                setIsLoading(false);
                return null;
            }

            const response = await axios.get(`${API_URL}/api/notes?showArchived=${showArchived}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.status === 200) {
                const fetchedNotes = response.data || [];
                const nonArchivedNotes = fetchedNotes.filter(note => !note.isArchived);

                const processedNotes = nonArchivedNotes.map(note => ({
                    ...note,
                    tags: safelyParseTags(note.tags)
                }));
                const fetchedAndSortedNotes = sortNotes(processedNotes, sortOrder);
                setNotes(fetchedAndSortedNotes);
                toast.success("Notes synced from server!", { toastId: 'notesSyncedSuccess' });

                await db.notes.clear();
                await db.notes.bulkAdd(fetchedAndSortedNotes.map(note => ({
                    ...note,
                    backendId: note._id,
                    _id: undefined
                })));

            } else {
                const errorData = response.data;
                const errorMessage = errorData.message || `Failed to load notes: ${response.statusText}`;
                setError(errorMessage);
                toast.error(errorMessage);

                const cachedNotes = await db.notes.where({ isArchived: showArchived === 'true' }).toArray();
                setNotes(cachedNotes.map(note => ({
                    ...note,
                    _id: note.backendId
                })));
                if (cachedNotes.length > 0) {
                    toast.info("Showing cached notes (server error, potential offline mode)", { toastId: 'cachedNotesFallback' });
                } else {
                    toast.error('Failed to load notes from server and no cached notes found.');
                }
            }
        } catch (err) {
            console.error('Error fetching/caching notes:', err);

            if (axios.isAxiosError(err) && err.response && err.response.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
                toast.error("Session expired. Please log in again.");
            } else {
                const cachedNotes = await db.notes.where({ isArchived: showArchived === 'true' }).toArray();
                setNotes(cachedNotes.map(note => ({
                    ...note,
                    _id: note.backendId
                })));
                if (cachedNotes.length > 0) {
                    toast.info("Showing cached notes (network error, offline mode)", { toastId: 'cachedNotesNetworkError' });
                } else {
                    setError('Network error: Could not load notes from server or cache.');
                    toast.error('Network error. Could not load notes.');
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [navigate, sortNotes, sortOrder, setNotes, setIsLoading, setError]);

    useEffect(() => {
        if (!initialLoadHandled.current) {
            initialLoadHandled.current = true;
            fetchNotesData();
        }

        return () => {
            if (toast.isActive('notesLoadedToastId')) {
                toast.dismiss('notesLoadedToastId');
            }
            if (toast.isActive('cachedNotesInfo')) {
                toast.dismiss('cachedNotesInfo');
            }
            if (toast.isActive('notesSyncedSuccess')) {
                toast.dismiss('notesSyncedSuccess');
            }
            if (toast.isActive('cachedNotesFallback')) {
                toast.dismiss('cachedNotesFallback');
            }
            if (toast.isActive('cachedNotesNetworkError')) {
                toast.dismiss('cachedNotesNetworkError');
            }
        };
    }, [fetchNotesData]);

    const handleSearchAndSort = useCallback(() => {
        let updatedNotes = Array.isArray(notes) ? [...notes] : [];

        if (searchTerm) {
            updatedNotes = updatedNotes.filter(
                (note) =>
                    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (Array.isArray(note.tags) && note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
            );
        }
        setFilteredNotes(sortNotes(updatedNotes, sortOrder));
    }, [notes, searchTerm, sortOrder, sortNotes]);

    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        if (searchTerm.trim() !== "") {
            debounceTimeoutRef.current = setTimeout(() => {
                handleSearchAndSort();
            }, 300);
        } else {
            handleSearchAndSort();
        }

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [searchTerm, handleSearchAndSort]);

    useEffect(() => {
        handleSearchAndSort();
        setCurrentPage(1);
    }, [sortOrder, notes, handleSearchAndSort]);

    const handleMediaChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setMediaFile(file);
            setMediaFilePreview(URL.createObjectURL(file));
        } else {
            setMediaFile(null);
            setMediaFilePreview(null);
        }
    };

    const handleRemoveMedia = () => {
        setMediaFile(null);
        setMediaFilePreview(null);
    };

    const onEmojiClick = (emojiData) => {
        if (currentSpeechTarget === 'title') {
            setTitle((prevTitle) => prevTitle + emojiData.emoji);
        } else {
             if (editorRef.current) { // UNCOMMENTED
               editorRef.current.chain().focus().insertContent(emojiData.emoji).run(); // UNCOMMENTED
             } else { // UNCOMMENTED
            setContent((prevContent) => prevContent + emojiData.emoji);
             } // UNCOMMENTED
        }
    };

    const handleAddNote = async () => {
        if (!title.trim() || !content.trim() || content === '<p></p>') {
            toast.warning("Title and content cannot be empty.");
            return;
        }

        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        if (mediaFile) {
            formData.append("media", mediaFile);
        }

        const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        tagsArray.forEach(tag => {
            formData.append("tags", tag);
        });

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            };
            const response = await axios.post(`${API_URL}/api/notes`, formData, config);

            const newNoteWithProcessedTags = {
                ...response.data,
                tags: safelyParseTags(response.data.tags)
            };

            setNotes((prevNotes) => sortNotes([newNoteWithProcessedTags, ...(Array.isArray(prevNotes) ? prevNotes : [])], sortOrder));

            await db.notes.add({
                ...newNoteWithProcessedTags,
                backendId: newNoteWithProcessedTags._id,
                _id: undefined
            });

            setTitle("");
            setContent('<p></p>');
             if (editorRef.current) { // UNCOMMENTED
               editorRef.current.commands.setContent('<p></p>'); // UNCOMMENTED
             }

            setTagsInput("");
            setMediaFile(null);
            setMediaFilePreview(null);
            setShowEmojiPicker(false);
            setEditorKey(prevKey => prevKey + 1);
            toast.success("Note added successfully!");
        } catch (err) {
            if (err.response && err.response.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
            }
            toast.error("Failed to add note.");
        }
    };

    const confirmDelete = async () => {
        if (!noteToDeleteId) return;

        try {
            const token = localStorage.getItem("token");
            await axios.delete(`${API_URL}/api/notes/${noteToDeleteId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotes((prevNotes) => (Array.isArray(prevNotes) ? prevNotes.filter((note) => note._id !== noteToDeleteId) : []));

            await db.notes.where({ backendId: noteToDeleteId }).delete();

            toast.success("Note deleted successfully!");
        } catch (err) {
            if (err.response && err.response.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
            }
            toast.error("Failed to delete note.");
        } finally {
            setShowDeleteConfirm(false);
            setNoteToDeleteId(null);
        }
    };

    const handleDeleteClick = (noteId) => {
        setNoteToDeleteId(noteId);
        setShowDeleteConfirm(true);
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setNoteToDeleteId(null);
    };

    const handleNoteUpdated = useCallback(async (updatedNote) => {
        setNotes(prevNotes => {
            const notesArray = Array.isArray(prevNotes) ? prevNotes : [];
            const processedUpdatedNote = {
                ...updatedNote,
                tags: safelyParseTags(updatedNote.tags)
            };
            const newNotes = notesArray.map(note =>
                note._id === processedUpdatedNote._id ? processedUpdatedNote : note
            );
            return sortNotes(newNotes, sortOrder);
        });

        try {
            await db.notes.update(updatedNote.backendId || updatedNote._id, {
                ...updatedNote,
                tags: safelyParseTags(updatedNote.tags),
                backendId: updatedNote._id,
                _id: undefined
            });
        } catch (dbErr) {
            console.error("Error updating note in IndexedDB:", dbErr);
        }
    }, [sortNotes, sortOrder]);


    const handleTogglePin = useCallback(async (noteId, currentPinnedStatus) => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            toast.error("Session expired. Please log in again.");
            return;
        }

        setNotes(prevNotes => {
            const notesArray = Array.isArray(prevNotes) ? prevNotes : [];
            const updatedNotes = notesArray.map(n =>
                n._id === noteId ? { ...n, isPinned: !currentPinnedStatus } : n
            );
            return sortNotes(updatedNotes, sortOrder);
        });

        try {
            const response = await axios.put(
                `${API_URL}/api/notes/${noteId}`,
                { isPinned: !currentPinnedStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const syncedNote = {
                ...response.data,
                tags: safelyParseTags(response.data.tags)
            };
            setNotes(prevNotes => {
                const notesArray = Array.isArray(prevNotes) ? prevNotes : [];
                const newNotes = notesArray.map(n => n._id === syncedNote._id ? syncedNote : n);
                return sortNotes(newNotes, sortOrder);
            });

            await db.notes.update(syncedNote.backendId || syncedNote._id, {
                ...syncedNote,
                backendId: syncedNote._id,
                _id: undefined
            });

            toast.success(`Note ${!currentPinnedStatus ? 'pinned' : 'unpinned'} successfully!`);

        } catch (error) {
            console.error("Error toggling pin status:", error.response?.data || error.message);
            setNotes(prevNotes => {
                const notesArray = Array.isArray(prevNotes) ? prevNotes : [];
                const revertedNotes = notesArray.map(n =>
                    n._id === noteId ? { ...n, isPinned: currentPinnedStatus } : n
                );
                return sortNotes(revertedNotes, sortOrder);
            });

            if (error.response && error.response.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
            } else {
                toast.error(`Failed to ${!currentPinnedStatus ? 'pin' : 'unpin'} note. Please try again.`);
            }
        }
    }, [navigate, sortOrder, sortNotes]);

    const handleArchiveNote = useCallback(async (noteId) => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            toast.error("Session expired. Please log in again.");
            return;
        }

        try {
            await axios.put(
                `${API_URL}/api/notes/${noteId}/archive`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setNotes((prevNotes) => (
                Array.isArray(prevNotes) ? prevNotes.filter((note) => note._id !== noteId) : []
            ));

            await db.notes.update(noteId, { isArchived: true });

            toast.success("Note archived successfully!");
        } catch (error) {
            console.error("Error archiving note:", error.response?.data || error.message);
            if (error.response && error.response.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
            } else {
                toast.error("Failed to archive note. Please try again.");
            }
        }
    }, [navigate]);


    const handleLogout = () => {
        localStorage.removeItem("token");
        toast.dismiss();
        toast.success("Logged out successfully!");
        setTimeout(() => {
            navigate("/login");
        }, 1000);
    };

    const indexOfLastNote = currentPage * notesPerPage;
    const indexOfFirstNote = indexOfLastNote - notesPerPage;
    const currentNotes = Array.isArray(filteredNotes) ? filteredNotes.slice(indexOfFirstNote, indexOfLastNote) : [];

    return (
        <div className="note-page-container">
            <header className="page-header">
                <div className="header-left-spacer"></div>

                <div className="brand-section">
                    <img src="./logo.png" alt="QuickNotes Logo" className="logo" />
                    <h2 className="app-title">StickyScribbles</h2>
                </div>

                <div className="header-actions">
                    <button className="button secondary" onClick={handleLogout}>
                        🔒
                    </button>
                    <button className="button theme-toggle" onClick={toggleTheme}>
                        {currentTheme === "dark" ? "🌞 " : "🌙 "}
                    </button>
                    <button className="button secondary" onClick={() => navigate('/archive')}>
                        📥
                    </button>
                </div>
            </header>

            <main className="main-content">
                <section className="search-sort-section">
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="sort-dropdown"
                    >
                        <option value="newest">Sort: Newest</option>
                        <option value="oldest">Sort: Oldest</option>
                    </select>
                </section>

                <section className="add-note-section">
                <input
    type="text"
    placeholder="Title"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    className="note-title-input"
/>
{/* This is where your EditorWrapper should be, without the extra <div> wrapper */}
<EditorWrapper
    initialContent={content}
    onContentChange={setContent}
    setEditorRef={stableSetEditorRef}
    key={editorKey}
/>
<input
    type="text"
    placeholder="Tags (comma-separated, e.g., work, urgent, idea)"
    value={tagsInput}
    onChange={(e) => {
        console.log("Tags input changed - current value:", e.target.value);
        setTagsInput(e.target.value);
    }}
    className="note-tags-input"
/>

                    <div className="action-buttons-row">
                        {recognition && (
                            <button
                                type="button"
                                onClick={() => (isListening && currentSpeechTarget === 'content' ? stopListening() : startListening('content'))}
                                className={`button emoji-toggle-button ${isListening && currentSpeechTarget === 'content' ? 'listening' : ''}`}
                                title={isListening && currentSpeechTarget === 'content' ? "Stop Voice Input" : "Start Voice Input for Content"}
                            >
                                {isListening && currentSpeechTarget === 'content' ? <FaMicrophoneSlash /> : <FaMicrophone />}
                            </button>
                        )}

                        <div className="emoji-picker-container">
                            <button
                                type="button"
                                className="emoji-toggle-button"
                                onClick={() => {
                                    setShowEmojiPicker(!showEmojiPicker);
                                    setCurrentSpeechTarget('content');
                                }}
                                aria-label="Toggle emoji picker"
                            >
                                <BsEmojiSmileFill />
                            </button>
                            {showEmojiPicker && (
                                <div className="emoji-picker-dropdown">
                                    <EmojiPicker onEmojiClick={onEmojiClick} />
                                </div>
                            )}
                        </div>

                        <div className="file-input-wrapper">
                            <input
                                type="file"
                                accept="image/*,video/*,application/pdf"
                                onChange={handleMediaChange}
                                className="hidden-file-input"
                                id="mediaUpload"
                            />
                            <label htmlFor="mediaUpload" className="custom-file-upload-button">
                                Choose Image / Video / PDF
                            </label>
                            <span className="file-name-display">
                                {mediaFile ? mediaFile.name : "No file chosen"}
                            </span>
                        </div>
                    </div>

                    {mediaPreview && (
                        <div className="media-preview-container">
                            {mediaFile && mediaFile.type.startsWith('image/') ? (
                                <img src={mediaPreview} alt="Media Preview" className="uploaded-media-preview" />
                            ) : mediaFile && mediaFile.type.startsWith('video/') ? (
                                <video controls src={mediaPreview} className="uploaded-media-preview" />
                            ) : mediaFile && mediaFile.type === 'application/pdf' ? (
                                <iframe src={mediaPreview} title="PDF Preview" className="uploaded-pdf-preview" />
                            ) : null}

                            <button className="button danger small" onClick={handleRemoveMedia}>
                                Remove Media
                            </button>
                        </div>
                    )}
                    <button
                        className="button primary add-note-button"
                        onClick={handleAddNote}
                    >
                        Add Note
                    </button>
                </section>

                {isLoading ? (
                    <div className="loading-message-container">
                        <div className="spinner"></div>
                        <p>Loading notes...</p>
                    </div>
                ) : (
                    <>
                        {filteredNotes.length === 0 && searchTerm && (
                            <p className="no-notes-message">
                                No notes found matching your search.
                            </p>
                        )}
                        {filteredNotes.length === 0 && !searchTerm && (
                            <p className="no-notes-message">
                                You don't have any notes yet. Add one above!
                            </p>
                        )}

                        <section className="note-list-section">
                            <div className="notes-list">
                                {currentNotes.map((note) => (
                                    <NoteCard
                                        key={note._id}
                                        note={note}
                                        onDelete={handleDeleteClick}
                                        onNoteUpdated={handleNoteUpdated}
                                        onTogglePin={handleTogglePin}
                                        isArchivedView={false}
                                        onArchive={handleArchiveNote}
                                    />
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {filteredNotes.length > notesPerPage && (
                    <Pagination
                        totalNotes={filteredNotes.length}
                        notesPerPage={notesPerPage}
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                    />
                )}
            </main>

            {showDeleteConfirm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Confirm Deletion</h3>
                        <p>Are you sure you want to delete this note? This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="button danger" onClick={confirmDelete}>
                                Delete
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

export default NotePage;