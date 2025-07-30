// src/components/MediaViewerModal.js
import React, { useEffect, useCallback } from 'react';

const MediaViewerModal = ({ isOpen, mediaPath, mediaType, onClose }) => {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const fullMediaPath = mediaPath || null;

  const renderMediaContent = () => {
    if (!fullMediaPath) {
        return <p>Media not found or still loading...</p>;
    }

    switch (mediaType) {
      case 'image':
        return <img src={fullMediaPath} alt="Media" className="media-viewer-content-media" />;
      case 'video':
        return <video controls src={fullMediaPath} className="media-viewer-content-media modal-video-content" />;
      case 'application': // Specifically for PDFs
        return (
          <div className="pdf-viewer-container" style={{ width: '100%', height: 'calc(90vh - 100px)' }}>
            <iframe
              src={fullMediaPath}
              title="PDF Viewer"
              className="media-viewer-content-media"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
            <div className="pdf-actions">
              <a href={fullMediaPath} download className="button primary pdf-download-button">Download PDF</a>
            </div>
          </div>
        );
      default:
        return <p>Unsupported media type or no media available.</p>;
    }
  };

  return (
    <div className="media-viewer-modal-overlay" onClick={onClose}>
      <div className="media-viewer-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="media-viewer-modal-close" onClick={onClose}>&times;</button>
        {renderMediaContent()}
      </div>
    </div>
  );
};

export default MediaViewerModal;