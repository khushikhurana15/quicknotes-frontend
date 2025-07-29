import React from 'react';
import './Pagination.css'; 

const Pagination = ({ totalNotes, notesPerPage, currentPage, setCurrentPage }) => {
  const totalPages = Math.ceil(totalNotes / notesPerPage);

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="pagination-container"> {}
      <button className="button" onClick={goToPreviousPage} disabled={currentPage === 1}>
        Prev
      </button>
      <span className="page-info">Page {currentPage} of {totalPages}</span> {}
      <button className="button" onClick={goToNextPage} disabled={currentPage === totalPages}>
        Next
      </button>
    </div>
  );
};

export default Pagination;