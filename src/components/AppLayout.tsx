import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/orders', label: 'Orders' },
  { to: '/admin', label: 'Admin', adminOnly: true },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="mb-8">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Secure Order Portal</div>
          <div className="mt-2 text-xl font-semibold text-slate-950">Order Portal</div>
        </div>
        <nav className="space-y-1">
          {links
            .filter((link) => !(link.adminOnly && user?.role !== 'admin'))
            .map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8 z-50">
          <div>
            <div className="text-sm font-medium text-slate-950">{user?.full_name || user?.email}</div>
            <div className="text-xs capitalize text-slate-500">{user?.role} access</div>
          </div>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
            onClick={() => void logout()}
          >
            Logout
          </button>
        </header>
        <div className="min-h-0 flex-1 flex overflow-hidden">
          <main className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
