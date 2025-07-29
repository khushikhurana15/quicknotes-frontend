import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header = ({ onToggleTheme }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 20px',
      backgroundColor: '#f5f5f5',
      borderBottom: '1px solid #ddd'
    }}>
      <h2 style={{ margin: 0 }}></h2>
      
      <div>
        <button onClick={onToggleTheme} style={{ marginRight: '10px' }}>
          Toggle Theme 🎨
        </button>
        <button onClick={handleLogout} style={{ backgroundColor: 'red', color: 'white' }}>
          Logout 🔓
        </button>
      </div>
    </div>
  );
};

export default Header;
