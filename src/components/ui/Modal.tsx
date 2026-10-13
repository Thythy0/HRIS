import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ children, onClose, size }: { children: React.ReactNode; onClose: () => void; size?: 'sm' | 'lg' }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', esc); };
  }, [onClose]);
  return createPortal(
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" className={`card p-5 md:p-6 w-full max-h-[85vh] overflow-y-auto ${size === 'sm' ? 'max-w-lg' : 'max-w-2xl'}`}>{children}</div>
    </div>,
    document.body
  );
}
