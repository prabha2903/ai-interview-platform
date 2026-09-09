import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bot, History, User, Sparkles, Mic } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      {/* Workspace Section Header Label */}
      <div style={{ padding: '0 8px 16px 8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Workspace Navigation
      </div>
      
      {/* Navigation Route Arrays */}
      <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <LayoutDashboard size={18} />
        Dashboard Overview
      </NavLink>
      <NavLink to="/ai-assistant" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <Bot size={18} />
        Gemini AI Workspace
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <History size={18} />
        Prompt History
      </NavLink>
      <NavLink to="/interview-prep" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <Mic size={18} />
        Interview Prep
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <User size={18} />
        Account Profile
      </NavLink>

      {/* FIXED: Bottom Banner Wrapper using theme variables instead of dark-fused properties */}
      <div style={{ 
        marginTop: 'auto', 
        padding: '16px', 
        background: 'var(--primary-light)', 
        borderRadius: 'var(--radius-md)', 
        border: '1px solid var(--border-highlight)' 
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: 'var(--primary)', 
          fontWeight: 600, 
          fontSize: '0.85rem', 
          marginBottom: '4px' 
        }}>
          <Sparkles size={16} />
          Powered by Gemini 3.5
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          State-of-the-art AI reasoning engine.
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
