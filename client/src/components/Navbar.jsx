import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  LayoutDashboard, 
  Bot, 
  History, 
  User, 
  LogOut,
  Mic
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand Logo */}
        <Link to={isAuthenticated ? "/dashboard" : "/"} className="navbar-brand">
          <div className="navbar-brand-icon">
            <Sparkles size={20} />
          </div>
          <span className="gradient-text">GeminiAI</span> Platform
        </Link>

        {/* Desktop Links */}
        <div className="navbar-links" style={{ display: mobileMenuOpen ? 'flex' : undefined }}>
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                <LayoutDashboard size={18} />
                Dashboard
              </NavLink>
              <NavLink to="/ai-assistant" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                <Bot size={18} />
                AI Assistant
              </NavLink>
              <NavLink to="/history" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                <History size={18} />
                History
              </NavLink>
              <NavLink to="/interview-prep" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                <Mic size={18} />
                Interview Prep
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                <User size={18} />
                Profile
              </NavLink>
              
              <div className="user-menu" style={{ marginLeft: '12px' }}>
                <div className="user-avatar" title={user?.name}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                Home
              </NavLink>
              <Link to="/login" className="btn btn-secondary">
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
