const ThemeToggle = ({ darkMode, toggleTheme }) => {
    return (
      <button
        onClick={toggleTheme}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          padding: '10px 15px',
          backgroundColor: darkMode ? '#f1c40f' : '#2c3e50',
          color: darkMode ? '#000' : '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>
    );
  };
  export default ThemeToggle;
