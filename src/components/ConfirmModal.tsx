import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium" onClick={onCancel}>
            Cancel
          </button>
          <button className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
