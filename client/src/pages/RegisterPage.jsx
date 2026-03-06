import React from 'react';
import LoginPage from './LoginPage';

const RegisterPage = ({ onLoginSuccess }) => {
  return <LoginPage mode="register" onLoginSuccess={onLoginSuccess} />;
};

export default RegisterPage;