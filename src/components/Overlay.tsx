import { useEffect, type ReactNode } from 'react';
import { IconClose } from './icons';

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40 animate-fade" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92dvh] overflow-y-auto bg-bg border border-border rounded-t-xl sm:rounded-xl animate-reveal pb-safe`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-bg pl-5 pr-1">
          <h2 className="font-serif text-lg font-semibold">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/** Right slide-over on desktop, bottom sheet on mobile. */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/30 animate-fade" onClick={onClose} />
      <aside
        className="drawer-panel absolute inset-x-0 bottom-0 max-h-[82dvh] rounded-t-xl border-t border-border bg-bg flex flex-col
          md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:rounded-none md:border-t-0 md:border-l"
      >
        <div className="md:hidden flex justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-border pl-5 pr-1">
          <h2 className="font-serif text-lg font-semibold">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 pb-safe">{children}</div>
      </aside>
    </div>
  );
}
