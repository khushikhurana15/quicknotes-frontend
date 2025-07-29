import React, { useState } from 'react';

const PasswordInput = ({ value, onChange, placeholder }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        style={{ paddingRight: '2rem' }}
      />
      <span
        onClick={() => setShowPassword(!showPassword)}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {showPassword ? '🙈' : '👁️'}
      </span>
    </div>
  );
};

export default PasswordInput;
