import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../lib/types';

export default function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { loading, session, user, hasRole } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading session...</div>;
  }

  if (!session || !user) return <Navigate to="/login" replace />;
  if (roles && !hasRole(roles)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
