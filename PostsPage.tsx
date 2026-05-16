import { useState, useEffect } from 'react';
import { useRouteTools } from 'swagger-webmcp/react';
import openApiSpec from '../api/openapi.json';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PostsPage() {
  // Registers listPosts + getPost tools on mount.
  // Unregisters them when navigating away.
  const { loading: toolsLoading, error: toolsError } = useRouteTools(
    { key: 'posts', tags: ['posts'] },
    { spec: openApiSpec, baseUrl: 'https://jsonplaceholder.typicode.com' }
  );

  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    setDataLoading(true);
    // Only fetch first 10 posts to keep the demo clean
    fetch('https://jsonplaceholder.typicode.com/posts?_limit=10')
      .then((r) => r.json())
      .then((data) => {
        setPosts(data);
        setDataLoading(false);
      })
      .catch((err) => {
        setDataError(err.message);
        setDataLoading(false);
      });
  }, []);

  const handleSelectPost = (post: Post) => {
    if (selectedPost?.id === post.id) {
      setSelectedPost(null);
      return;
    }
    setSelectedPost(post);
  };

  return (
    <div>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>Posts</h2>
        <ToolStatus loading={toolsLoading} error={toolsError} scope="posts" />
      </div>

      {dataError && <div style={styles.error}>Error: {dataError}</div>}

      <div style={styles.layout}>
        {/* Post List */}
        <div style={styles.list}>
          {dataLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={styles.skeleton} />
              ))
            : posts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    ...styles.card,
                    ...(selectedPost?.id === post.id ? styles.cardSelected : {}),
                  }}
                  onClick={() => handleSelectPost(post)}
                >
                  <div style={styles.cardId}>#{post.id}</div>
                  <div style={styles.cardTitle}>{post.title}</div>
                  <div style={styles.cardPreview}>
                    {post.body.slice(0, 60)}...
                  </div>
                </div>
              ))}
        </div>

        {/* Post Detail */}
        {selectedPost && (
          <div style={styles.detail}>
            <div style={styles.detailId}>Post #{selectedPost.id}</div>
            <div style={styles.detailTitle}>{selectedPost.title}</div>
            <div style={styles.detailMeta}>by User #{selectedPost.userId}</div>
            <div style={styles.detailBody}>{selectedPost.body}</div>

            <div style={styles.detailMcpNote}>
              ↑ This data was fetched via the <strong>getPost</strong> MCP tool endpoint
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
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
    border: '1px solid #3b82f6',
    backgroundColor: '#eff6ff',
  },
  cardId: {
    fontSize: '11px',
    color: '#888',
    fontFamily: 'monospace',
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: '13px',
    textTransform: 'capitalize',
    lineHeight: '1.3',
  },
  cardPreview: {
    fontSize: '12px',
    color: '#777',
    lineHeight: '1.4',
  },
  skeleton: {
    height: '80px',
    backgroundColor: '#eee',
    borderRadius: '6px',
  },
  detail: {
    flex: 1,
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detailId: {
    fontSize: '12px',
    color: '#888',
    fontFamily: 'monospace',
  },
  detailTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    textTransform: 'capitalize',
    lineHeight: '1.3',
  },
  detailMeta: {
    fontSize: '12px',
    color: '#3b82f6',
    paddingBottom: '10px',
    borderBottom: '1px solid #eee',
  },
  detailBody: {
    fontSize: '14px',
    color: '#444',
    lineHeight: '1.6',
  },
  detailMcpNote: {
    marginTop: '8px',
    padding: '10px 12px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#1e40af',
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
    color: '#3b82f6',
    fontFamily: 'monospace',
  },
  statusError: {
    fontSize: '12px',
    color: '#ef4444',
    fontFamily: 'monospace',
  },
};
