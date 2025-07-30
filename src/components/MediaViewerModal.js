// src/components/MediaViewerModal.js
import React, { useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set the workerSrc directly to the path in the public folder.
// Create React App serves files from the public folder at the root.
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`; // <--- Use the correct .mjs extension

// Define BACKEND_URL. This should match your backend server URL.
const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const MediaViewerModal = ({ isOpen, mediaPath, mediaType, onClose }) => {
  const [numPages, setNumPages] = React.useState(null);
  const [pageNumber, setPage] = React.useState(1);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPage(1);
  };

  const changePage = (offset) => {
    setPage(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

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

  const fullMediaPath = mediaPath || null; // Simply use mediaPath directly, or null if it's empty
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
          <div className="pdf-viewer-container">
            <Document
              file={fullMediaPath}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error("Error loading PDF document:", error);
                // Log the pdfjs.version to see what API version react-pdf thinks it's using
                console.log("pdfjs.version (API version):", pdfjs.version);
              }}
              loading="Loading PDF..."
              error="Failed to load PDF."
              noData="No PDF file specified."
            >
              <Page pageNumber={pageNumber} />
            </Document>
            {numPages && (
              <div className="pdf-controls">
                <button
                  type="button"
                  disabled={pageNumber <= 1}
                  onClick={previousPage}
                >
                  Previous
                </button>
                <span>
                  Page {pageNumber || (numPages ? 1 : '--')} of {numPages || '--'}
                </span>
                <button
                  type="button"
                  disabled={pageNumber >= numPages}
                  onClick={nextPage}
                >
                  Next
                </button>
              </div>
            )}
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