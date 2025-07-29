// components/ShareModal.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // Import toast for notifications
import { IoCloseCircleOutline } from 'react-icons/io5'; // Import close icon

// Import your CSS file for modal styling
import './ShareModal.css';

// Base URL for your backend API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ShareModal = ({ noteId, onClose, isOpen }) => {
    const [shareLink, setShareLink] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isShared, setIsShared] = useState(false); // To track if a link already exists and is active
    const [isLoadingInitial, setIsLoadingInitial] = useState(true); // New state for initial load

    // Effect to fetch existing share link when modal opens or noteId changes
    useEffect(() => {
        const fetchExistingShareLink = async () => {
            if (!isOpen || !noteId) {
                setIsLoadingInitial(false);
                return;
            }

            setIsLoadingInitial(true);
            setShareLink(''); // Clear previous link
            setIsShared(false); // Assume no link until proven otherwise

            try {
                // This API call checks if a public link already exists for this note
                // IMPORTANT: This route needs to be implemented on your backend
                // It should return the shareId if it exists for the given noteId, and the note is public.
                const response = await fetch(`${API_URL}/api/notes/${noteId}/share-info`, { // Example endpoint name
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}` // Sharing logic usually requires auth for the *creator*
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.isPublic && data.shareId) { // Backend should return isPublic status and shareId
                        // Construct the full public URL using the unique shareId
                        // The frontend path '/share/' should match your React Router setup for the public view
                        setShareLink(`${window.location.origin}/share/${data.shareId}`);
                        setIsShared(true);
                        toast.info("Existing public link found for this note.");
                    } else {
                        setIsShared(false);
                        setShareLink('');
                    }
                } else if (response.status === 404) {
                    // No existing public link found for this note (or note not found/public)
                    setIsShared(false);
                    setShareLink('');
                    toast.info("No public link found for this note. You can generate one.");
                } else {
                    console.error("Error fetching share link info:", response.statusText);
                    toast.error("Failed to fetch share link information.");
                }
            } catch (error) {
                console.error("Network error fetching share link info:", error);
                toast.error("Network error fetching share link information.");
            } finally {
                setIsLoadingInitial(false);
            }
        };

        fetchExistingShareLink();
    }, [isOpen, noteId]);

    const generateShareLink = async () => {
        if (isGenerating) return; // Prevent multiple clicks

        setIsGenerating(true);
        setShareLink(''); // Clear previous state
        setIsShared(false);

        try {
            // This API call tells your backend to generate a unique share ID,
            // set the note's 'isPublic' flag to true, and return the share ID.
            // IMPORTANT: This route needs to be implemented on your backend
            const response = await fetch(`${API_URL}/api/notes/${noteId}/share`, { // Example endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // Requires authentication for the note creator
                },
                body: JSON.stringify({ isPublic: true }) // Send data to tell backend to make it public
            });

            if (response.ok) {
                const data = await response.json();
                if (data.shareId) {
                    const generatedUrl = `${window.location.origin}/share/${data.shareId}`;
                    setShareLink(generatedUrl);
                    setIsShared(true);
                    toast.success("Public link generated successfully!");
                } else {
                    toast.error("Backend did not return a share ID.");
                }
            } else {
                console.error('Failed to generate share link:', response.status, response.statusText);
                const errorData = await response.json();
                toast.error(`Failed to generate link: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Error generating share link:', error);
            toast.error("Network error or server issue during link generation.");
        } finally {
            setIsGenerating(false);
        }
    };

    const disableShareLink = async () => {
        if (!isShared || !noteId) return; // Only disable if a link exists

        try {
            // This API call tells your backend to remove the share ID or set 'isPublic' to false.
            // IMPORTANT: This route needs to be implemented on your backend
            const response = await fetch(`${API_URL}/api/notes/${noteId}/share`, { // Example endpoint
                method: 'DELETE', // Or PUT with body: { isPublic: false }
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // Requires authentication
                }
            });

            if (response.ok) {
                setShareLink('');
                setIsShared(false);
                toast.info("Public link disabled.");
            } else {
                console.error('Failed to disable share link:', response.status, response.statusText);
                const errorData = await response.json();
                toast.error(`Failed to disable link: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Error disabling share link:', error);
            toast.error("Network error or server issue during link disabling.");
        }
    };

    const copyToClipboard = () => {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink).then(() => {
                toast.success('Link copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                toast.error('Failed to copy link.');
            });
        }
    };

    // If modal is not open, don't render anything
    if (!isOpen) return null;

    return (
        <div className="share-modal-overlay" onClick={onClose}>
            <div className="share-modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-modal-button" onClick={onClose}>
                    <IoCloseCircleOutline />
                </button>
                <h2>Share Note</h2>

                {isLoadingInitial ? (
                    <p>Loading share link information...</p>
                ) : isGenerating ? (
                    <p>Generating public link...</p>
                ) : isShared && shareLink ? (
                    <>
                        <p>Share this public, view-only link:</p>
                        <input
                            type="text"
                            value={shareLink}
                            readOnly
                            className="share-link-input"
                            onClick={(e) => e.target.select()} // Select text on click for easy copy
                        />
                        <div className="share-modal-actions">
                            <button onClick={copyToClipboard} className="button">Copy Link</button>
                            <button onClick={disableShareLink} className="button danger-button">Disable Link</button>
                        </div>
                    </>
                ) : (
                    <>
                        <p>This note is not currently public.</p>
                        <p>Generate a public, view-only link for this note.</p>
                        <button onClick={generateShareLink} className="button primary-button">Generate Public Link</button>
                    </>
                )}
                {!isLoadingInitial && !isGenerating && ( // Message for notes that are public without a shareId, if that's a case
                     <p className="share-modal-warning">
                        Ensure the note is marked as public in your backend for this link to work.
                    </p>
                )}
            </div>
        </div>
    );
};

export default ShareModal;