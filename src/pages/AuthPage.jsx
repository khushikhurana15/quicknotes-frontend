import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PasswordInput from '../components/PasswordInput';
import './AuthPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? 'login' : 'signup';

    try {
      const res = await axios.post(`http://localhost:5000/api/auth/${endpoint}`, {
        email,
        password,
      });

      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        alert('Login successful!');
        navigate('/');
      } else {
        alert('Signup successful! You can now log in.');
        setIsLogin(true);
      }
    } catch (err) {
      alert(`${isLogin ? 'Login' : 'Signup'} failed: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Login' : 'Signup'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />

        <button type="submit">{isLogin ? 'Login' : 'Signup'}</button>
      </form>

      <p style={{ marginTop: '10px' }}>
        {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
        <button onClick={() => setIsLogin(!isLogin)} className="toggle-btn">
          {isLogin ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </div>
  );
};

export default AuthPage;
