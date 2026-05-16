import React from 'react';
import { useRegisteredTools } from 'swagger-webmcp/react';

export default function ToolDebugPanel() {
  const tools = useRegisteredTools(500);

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.dot} />
        Registered MCP Tools
      </div>

      <div style={styles.count}>
        {tools.length} tool{tools.length !== 1 ? 's' : ''} active
      </div>

      {tools.length === 0 ? (
        <div style={styles.empty}>No tools registered</div>
      ) : (
        <ul style={styles.list}>
          {tools.map((name) => (
            <li key={name} style={styles.item}>
              <span style={styles.bullet}>▸</span>
              {name}
            </li>
          ))}
        </ul>
      )}

      <div style={styles.footer}>
        Check &lt;head&gt; in DevTools for JSON-LD
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '260px',
    minWidth: '260px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '13px',
    borderLeft: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    gap: '12px',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 'bold',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#888',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    display: 'inline-block',
  },
  count: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  empty: {
    color: '#555',
    fontStyle: 'italic',
    fontSize: '12px',
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#3b82f6',
    padding: '4px 8px',
    backgroundColor: '#0d1117',
    borderRadius: '4px',
    border: '1px solid #1e3a5f',
  },
  bullet: {
    color: '#10b981',
    fontSize: '10px',
  },
  footer: {
    marginTop: 'auto',
    color: '#444',
    fontSize: '11px',
    borderTop: '1px solid #333',
    paddingTop: '12px',
  },
};
