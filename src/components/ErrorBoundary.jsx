// src/components/ErrorBoundary.jsx

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{
          padding: '20px',
          margin: '50px auto',
          maxWidth: '600px',
          textAlign: 'center',
          backgroundColor: 'var(--card-bg)', // Use your existing theme variables
          color: 'var(--text-color)',
          borderRadius: '8px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          border: '1px solid var(--border-color)'
        }}>
          <h2 style={{ color: 'var(--danger-color)' }}>Oops! Something went wrong.</h2>
          <p>We're sorry, but an unexpected error occurred. Please try refreshing the page.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', marginTop: '20px', fontSize: '0.8em', color: 'var(--text-secondary)' }}>
              <summary>Error Details (for developers)</summary>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo.componentStack}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;