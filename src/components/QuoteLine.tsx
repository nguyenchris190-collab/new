import type { Quote } from '../lib/quotes';
import { IconClose } from './icons';

/** Quiet, single-quote line. Never blocks the screen; optionally dismissible. */
export function QuoteLine({ quote, className = '', onDismiss }: { quote: Quote; className?: string; onDismiss?: () => void }) {
  return (
    <figure className={`flex items-start gap-2 ${className}`} data-quote-id={quote.id}>
      <span className="mt-0.5 h-full w-0.5 self-stretch rounded bg-accent/50" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <blockquote className="font-serif text-[15px] italic leading-snug">“{quote.text}”</blockquote>
        <figcaption className="mt-0.5 text-xs text-muted">— {quote.source}</figcaption>
      </div>
      {onDismiss && (
        <button className="btn-icon -my-2 -mr-2 shrink-0 text-muted" onClick={onDismiss} aria-label="Dismiss quote">
          <IconClose size={16} />
        </button>
      )}
    </figure>
  );
}
