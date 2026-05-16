import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import UsersPage from './pages/UsersPage';
import PostsPage from './pages/PostsPage';
import ToolDebugPanel from './components/ToolDebugPanel';

export default function App() {
  return (
    <BrowserRouter>
      <div style={styles.app}>

        {/* Header + Tabs */}
        <header style={styles.header}>
          <h1 style={styles.title}>Swagger WebMCP Demo</h1>
          <nav style={styles.nav}>
            <NavLink
              to="/users"
              style={({ isActive }) => ({
                ...styles.tab,
                ...(isActive ? styles.tabActive : {}),
              })}
            >
              Users
            </NavLink>
            <NavLink
              to="/posts"
              style={({ isActive }) => ({
                ...styles.tab,
                ...(isActive ? styles.tabActive : {}),
              })}
            >
              Posts
            </NavLink>
          </nav>
        </header>

        {/* Main content + debug panel side by side */}
        <div style={styles.body}>
          <main style={styles.main}>
            <Routes>
              <Route path="/" element={<Navigate to="/users" replace />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/posts" element={<PostsPage />} />
            </Routes>
          </main>

          {/* Always visible — shows tool registration changes live */}
          <ToolDebugPanel />
        </div>

      </div>
    </BrowserRouter>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    fontFamily: 'monospace',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#10b981',
  },
  nav: {
    display: 'flex',
    gap: '8px',
  },
  tab: {
    padding: '6px 16px',
    borderRadius: '4px',
    textDecoration: 'none',
    color: '#ccc',
    fontSize: '14px',
    border: '1px solid #444',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#10b981',
    color: '#fff',
    border: '1px solid #10b981',
  },
  body: {
    display: 'flex',
    gap: '0',
    height: 'calc(100vh - 60px)',
  },
  main: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
  },
};
