import React, { useMemo } from 'react';
import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Renders prose mixed with inline `$...$` and display `$$...$$` LaTeX via KaTeX.
 * Also safely renders inline `x^{2}` / `b_{1}` tokens even if not wrapped in `$`.
 */
export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
  const html = useMemo(() => {
    const raw = String(text || '');
    // First split by $$...$$ display math, then $...$ inline math
    const parts = raw.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
    return parts
      .map((part) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const expr = part.slice(2, -2);
          try {
            return katex.renderToString(expr, {
              displayMode: true,
              throwOnError: false,
            });
          } catch {
            return escapeHtml(part);
          }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const expr = part.slice(1, -1);
          try {
            return katex.renderToString(expr, {
              displayMode: false,
              throwOnError: false,
            });
          } catch {
            return escapeHtml(part);
          }
        }
        // Outside $...$, convert stray ^{...} or _{...} tokens into KaTeX spans
        const subSupParts = part.split(/([a-zA-Z0-9]+(?:\^\{[^}]+\}|_\{[^}]+\})+)/g);
        return subSupParts
          .map((sub, idx) => {
            if (idx % 2 === 1) {
              try {
                return katex.renderToString(sub, {
                  displayMode: false,
                  throwOnError: false,
                });
              } catch {
                return escapeHtml(sub);
              }
            }
            return escapeHtml(sub);
          })
          .join('');
      })
      .join('');
  }, [text]);

  return (
    <span
      className={`leading-relaxed break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c] || c;
  });
}
