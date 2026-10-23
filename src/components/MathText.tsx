import katex from 'katex';
import 'katex/dist/katex.min.css';
import { memo, useMemo } from 'react';

type Segment = { kind: 'text' | 'inline' | 'display'; value: string };

const cache = new Map<string, string>();

function render(tex: string, displayMode: boolean): string {
  const key = (displayMode ? 'D' : 'I') + tex;
  let html = cache.get(key);
  if (html === undefined) {
    html = katex.renderToString(tex, { displayMode, throwOnError: false, strict: 'ignore', trust: false, output: 'html' });
    if (cache.size > 2000) cache.clear();
    cache.set(key, html);
  }
  return html;
}

/** Split text on $$…$$, \[…\], $…$ and \(…\) delimiters. `\$` is a literal dollar. */
export function tokenize(src: string): Segment[] {
  const out: Segment[] = [];
  let buf = '';
  let i = 0;
  const flush = () => {
    if (buf) out.push({ kind: 'text', value: buf });
    buf = '';
  };
  const tryClose = (open: string, close: string, kind: Segment['kind']) => {
    if (!src.startsWith(open, i)) return false;
    const end = src.indexOf(close, i + open.length);
    if (end < 0) return false;
    const body = src.slice(i + open.length, end);
    if (!body.trim()) return false;
    flush();
    out.push({ kind, value: body });
    i = end + close.length;
    return true;
  };
  while (i < src.length) {
    if (src[i] === '\\' && src[i + 1] === '$') {
      buf += '$';
      i += 2;
      continue;
    }
    if (tryClose('$$', '$$', 'display') || tryClose('\\[', '\\]', 'display') || tryClose('\\(', '\\)', 'inline')) continue;
    if (src[i] === '$') {
      // find unescaped closing $
      let j = i + 1;
      while (j < src.length && !(src[j] === '$' && src[j - 1] !== '\\')) j++;
      if (j < src.length && j > i + 1) {
        flush();
        out.push({ kind: 'inline', value: src.slice(i + 1, j) });
        i = j + 1;
        continue;
      }
    }
    buf += src[i++];
  }
  flush();
  return out;
}

const LOOKS_LIKE_TEX = /\\[a-zA-Z]+|[\^_]|\{.*\}/;

interface Props {
  text: string;
  className?: string;
  /** Treat undelimited input that looks like LaTeX as inline math (useful for choices). */
  autoMath?: boolean;
}

/**
 * Renders prose with embedded KaTeX. Display equations are wrapped in their
 * own horizontal scroll container so long formulas never widen the page.
 */
function MathTextImpl({ text, className, autoMath }: Props) {
  const segments = useMemo(() => {
    if (autoMath && !text.includes('$') && !text.includes('\\(') && !text.includes('\\[') && LOOKS_LIKE_TEX.test(text)) {
      return [{ kind: 'inline', value: text }] as Segment[];
    }
    return tokenize(text);
  }, [text, autoMath]);

  return (
    <span className={className}>
      {segments.map((s, i) => {
        if (s.kind === 'text') {
          // Preserve author line breaks.
          const lines = s.value.split('\n');
          return lines.map((l, j) => (
            <span key={`${i}-${j}`}>
              {j > 0 && <br />}
              {l}
            </span>
          ));
        }
        if (s.kind === 'display') {
          return <span key={i} className="math-scroll block" dangerouslySetInnerHTML={{ __html: render(s.value, true) }} />;
        }
        return <span key={i} className="math-inline-scroll" dangerouslySetInnerHTML={{ __html: render(s.value, false) }} />;
      })}
    </span>
  );
}

export const MathText = memo(MathTextImpl);
