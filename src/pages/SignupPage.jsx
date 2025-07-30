import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import PasswordInput from '../components/PasswordInput';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Ensure this path is correct. If LoginPage.css is in a 'styles' folder
// outside of 'pages', it might be '../styles/LoginPage.css'.
import './LoginPage.css';

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/signup`, {
        name,
        email,
        password,
      });
      toast.success("Signup successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Signup failed. Please try again.");
      }
    }
  };

  return (
    // Outer container to center the form, styled by .login-page-container
    <div className="login-page-container">
      {/* Inner card container for the form, styled by .login-form-card */}
      <div className="login-form-card">
        <h2>Sign Up</h2>
        <form onSubmit={handleSignup}>
          {/* Inputs will be styled by .login-form-card input[type="text/email/password"] */}
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* PasswordInput component. Make sure it internally renders an input
              that gets styled by .login-form-card input[type="password"] */}
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            // If your PasswordInput component accepts a className prop and applies it
            // to its internal input, you could add: className="form-input" here
            // if your CSS has a .form-input style.
          />

          {/* Apply the .login-button class to the submit button */}
          <button type="submit" className="login-button">Sign Up</button>
        </form>

        {/* Apply .signup-text and .signup-link classes for styling */}
        <p className="signup-text">
          Already have an account? <Link to="/login" className="signup-link">Login</Link>
        </p>
      </div> {/* Close login-form-card */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default SignupPage;