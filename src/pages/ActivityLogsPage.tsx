import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getActivityLogs } from '../lib/supabaseApi';
import type { ActivityLog } from '../lib/types';

export default function ActivityLogsPage() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    getActivityLogs(session.access_token)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-950">Activity Logs</h1>
        <p className="mt-1 text-sm text-slate-500">Tool invocation results, timestamps, and permission-denied events.</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Message</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={5}>Loading activity...</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100">
                <td className="px-4 py-3">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">{log.action}</td>
                <td className="px-4 py-3">{log.status}</td>
                <td className="px-4 py-3 font-mono text-xs">{log.target_id?.slice(0, 8) || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{log.message || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
