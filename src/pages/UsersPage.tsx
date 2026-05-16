import React from 'react';
import { useState, useEffect } from 'react';
import { useRouteTools } from 'swagger-webmcp/react';
import openApiSpec from '../api/openapi.json';

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  website: string;
  company: { name: string };
  address: { city: string; street: string };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  // Registers listUsers + getUser tools on mount.
  // Unregisters them when navigating away.
  const { loading: toolsLoading, error: toolsError } = useRouteTools(
    { key: 'users', tags: ['users'] },
    { spec: openApiSpec, baseUrl: 'https://jsonplaceholder.typicode.com' }
  );

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Fetch users list directly via fetch (same endpoint the MCP tool would call)
  useEffect(() => {
    setDataLoading(true);
    fetch('https://jsonplaceholder.typicode.com/users')
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setDataLoading(false);
      })
      .catch((err) => {
        setDataError(err.message);
        setDataLoading(false);
      });
  }, []);

  const handleSelectUser = (user: User) => {
    // If same user clicked, deselect
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
      return;
    }
    setSelectedUser(user);
  };

  return (
    <div>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>Users</h2>
        {/* Tool registration status */}
        <ToolStatus loading={toolsLoading} error={toolsError} scope="users" />
      </div>

      {dataError && <div style={styles.error}>Error: {dataError}</div>}

      <div style={styles.layout}>
        {/* User List */}
        <div style={styles.list}>
          {dataLoading
            ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={styles.skeleton} />
            ))
            : users.map((user) => (
              <div
                key={user.id}
                style={{
                  ...styles.card,
                  ...(selectedUser?.id === user.id ? styles.cardSelected : {}),
                }}
                onClick={() => handleSelectUser(user)}
              >
                <div style={styles.cardRow}>
                  <span style={styles.avatar}>{user.name[0]}</span>
                  <div>
                    <div style={styles.cardName}>{user.name}</div>
                    <div style={styles.cardSub}>@{user.username}</div>
                  </div>
                </div>
                <div style={styles.cardEmail}>{user.email}</div>
              </div>
            ))}
        </div>

        {/* User Detail */}
        {selectedUser && (
          <div style={styles.detail}>
            <div style={styles.detailHeader}>
              <span style={styles.detailAvatar}>{selectedUser.name[0]}</span>
              <div>
                <div style={styles.detailName}>{selectedUser.name}</div>
                <div style={styles.detailUsername}>@{selectedUser.username}</div>
              </div>
            </div>

            <div style={styles.detailSection}>
              <Label>Email</Label>
              <Value>{selectedUser.email}</Value>
              <Label>Phone</Label>
              <Value>{selectedUser.phone}</Value>
              <Label>Website</Label>
              <Value>{selectedUser.website}</Value>
              <Label>Company</Label>
              <Value>{selectedUser.company.name}</Value>
              <Label>City</Label>
              <Value>{selectedUser.address.city}</Value>
              <Label>Street</Label>
              <Value>{selectedUser.address.street}</Value>
            </div>

            <div style={styles.detailMcpNote}>
              ↑ This data was fetched via the <strong>getUser</strong> MCP tool endpoint
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <div style={styles.label}>{children}</div>;
}
function Value({ children }: { children: React.ReactNode }) {
  return <div style={styles.value}>{children}</div>;
}

function ToolStatus({
  loading,
  error,
  scope,
}: {
  loading: boolean;
  error: Error | null;
  scope: string;
}) {
  if (loading) return <span style={styles.statusLoading}>⏳ Registering {scope} tools...</span>;
  if (error) return <span style={styles.statusError}>✗ Tool registration failed: {error.message}</span>;
  return <span style={styles.statusOk}>✓ {scope} tools registered</span>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  pageTitle: {
    margin: 0,
    fontSize: '20px',
    fontFamily: 'monospace',
  },
  layout: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '340px',
    minWidth: '340px',
  },
  card: {
    padding: '12px 14px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cardSelected: {
    border: '1px solid #10b981',
    backgroundColor: '#f0fdf4',
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    flexShrink: 0,
    lineHeight: '32px',
    textAlign: 'center',
  },
  cardName: {
    fontWeight: 'bold',
    fontSize: '14px',
  },
  cardSub: {
    fontSize: '12px',
    color: '#888',
  },
  cardEmail: {
    fontSize: '12px',
    color: '#555',
    paddingLeft: '42px',
  },
  skeleton: {
    height: '68px',
    backgroundColor: '#eee',
    borderRadius: '6px',
    animation: 'pulse 1.5s infinite',
  },
  detail: {
    flex: 1,
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '20px',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #eee',
  },
  detailAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    flexShrink: 0,
    lineHeight: '48px',
    textAlign: 'center',
  },
  detailName: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  detailUsername: {
    color: '#888',
    fontSize: '13px',
  },
  detailSection: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr',
    gap: '8px 12px',
    alignItems: 'start',
  },
  label: {
    fontSize: '12px',
    color: '#888',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingTop: '2px',
  },
  value: {
    fontSize: '14px',
    color: '#1a1a1a',
  },
  detailMcpNote: {
    marginTop: '20px',
    padding: '10px 12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#166534',
    fontFamily: 'monospace',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: '4px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  statusLoading: {
    fontSize: '12px',
    color: '#f59e0b',
    fontFamily: 'monospace',
  },
  statusOk: {
    fontSize: '12px',
    color: '#10b981',
    fontFamily: 'monospace',
  },
  statusError: {
    fontSize: '12px',
    color: '#ef4444',
    fontFamily: 'monospace',
  },
};
