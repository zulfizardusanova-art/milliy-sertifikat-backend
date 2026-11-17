import { evaluate, parse } from 'mathjs';

interface ParsedMathNode {
  traverse: (cb: (node: ParsedMathNode) => void) => void;
  evaluate: (scope: Record<string, number>) => unknown;
  toTex: () => string;
}

export function normalizeMathInput(v: string): string {
  return String(v)
    .slice(0, 80)
    .toLowerCase()
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/[°%]/g, '')
    .replace(/∛\s*\(/g, 'cbrt(')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([0-9a-z.]+)/g, 'sqrt($1)')
    .replace(/(\d+)\s+(\d+)\s*\/\s*(\d+)/g, '($1+$2/$3)')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(
      /([\d)])\s*(?:kv\.?\s*sm|kub\.?\s*sm|sm|mm|dm|km|kg|sek|min|soat|kun|gradus|foiz|so['‘’]?m|marta|ta|m|g|l|s)\.?$/,
      '$1'
    )
    .replace(/(\d|\))\s*(sqrt|cbrt|pi|\()/g, '$1*$2')
    .trim();
}

export function cleanAnswerText(v: string | number | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/^(?:javob|ответ|answer)\s*[:=-]?\s*/i, '')
    .replace(/[.;]+$/, '')
    .trim();
}

function evalNumeric(v: string): number | null {
  try {
    if (/=/.test(v)) return null;
    const r = evaluate(normalizeMathInput(v));
    return typeof r === 'number' && Number.isFinite(r) ? r : null;
  } catch {
    return null;
  }
}

function isInterval(x: string): boolean {
  return (
    /^[[(].*[;,].*[\])]$/.test(x) ||
    (/∞|inf/i.test(x) && /[[(]/.test(x))
  );
}

function normalizeInterval(x: string): string {
  return x
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/∞|infinity|inf/g, 'inf')
    .replace(/,/g, ';');
}

function equivalentExpr(x: string, y: string): boolean {
  const n1 = evalNumeric(x);
  const n2 = evalNumeric(y);
  if (n1 !== null && n2 !== null) {
    return Math.abs(n1 - n2) <= 1e-6 * Math.max(1, Math.abs(n2));
  }
  try {
    const raw1 = parse(normalizeMathInput(x)) as unknown;
    const raw2 = parse(normalizeMathInput(y)) as unknown;
    const e1 = (Array.isArray(raw1) ? raw1[0] : raw1) as ParsedMathNode;
    const e2 = (Array.isArray(raw2) ? raw2[0] : raw2) as ParsedMathNode;
    const vars = new Set<string>();
    const collect = (node: ParsedMathNode) => {
      node.traverse((n: ParsedMathNode) => {
        const sym = n as unknown as { isSymbolNode?: boolean; name?: string };
        if (
          sym.isSymbolNode &&
          sym.name &&
          sym.name !== 'pi' &&
          sym.name !== 'e' &&
          sym.name !== 'sqrt' &&
          sym.name !== 'cbrt'
        ) {
          vars.add(sym.name);
        }
      });
    };
    collect(e1);
    collect(e2);
    if (vars.size > 0 && vars.size <= 3) {
      const vArr = [...vars];
      const probes = [0.7, 1.3, 2.1, -1.7, 3.3, 0.2, -0.4];
      let ok = 0;
      for (let k = 0; k < 7; k++) {
        const scope: Record<string, number> = {};
        vArr.forEach((vr, idx) => {
          scope[vr] = probes[(k + idx * 2) % 7];
        });
        const a = e1.evaluate(scope);
        const b = e2.evaluate(scope);
        if (
          typeof a !== 'number' ||
          typeof b !== 'number' ||
          !Number.isFinite(a) ||
          !Number.isFinite(b)
        ) {
          continue;
        }
        if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(b))) return false;
        ok++;
      }
      if (ok >= 3) return true;
    }
  } catch {
    // fallback to string norm
  }
  const strip = (z: string) => normalizeMathInput(z).replace(/\s+/g, '');
  return strip(x) === strip(y);
}

function compareSingle(x: string, y: string): boolean {
  const splitEq = (z: string): [string | null, string] => {
    const m = z.match(/^\s*([a-zA-Zа-яА-Я]\w*)\s*=\s*(.+)$/);
    return m ? [m[1].toLowerCase(), m[2]] : [null, z];
  };
  const [a, p] = splitEq(x);
  const [b, q] = splitEq(y);
  if (a && b && a !== b) return false;
  return equivalentExpr(p, q);
}

function splitMulti(z: string): string[] {
  return z
    .split(/\s*;\s*|\s+(?:va|yoki|и|or|and)\s+|,\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function sameMathAnswer(aRaw: string, bRaw: string): boolean {
  const a = cleanAnswerText(aRaw);
  const b = cleanAnswerText(bRaw);
  if (!a || !b) return false;
  if (isInterval(a) || isInterval(b)) {
    return normalizeInterval(a) === normalizeInterval(b);
  }
  const A = splitMulti(a);
  const B = splitMulti(b);
  if (A.length > 1 || B.length > 1) {
    if (A.length !== B.length) return false;
    const used = new Set<number>();
    return A.every((x) => {
      const j = B.findIndex((y, idx) => !used.has(idx) && compareSingle(x, y));
      if (j < 0) return false;
      used.add(j);
      return true;
    });
  }
  return compareSingle(a, b);
}

export function checkWrittenAnswer(ans: string, acceptedKeys: string): number {
  const trimmed = String(ans ?? '').trim();
  if (!trimmed) return 0;
  return String(acceptedKeys)
    .split('\n')
    .some((k) => sameMathAnswer(trimmed, k))
    ? 1
    : 0;
}

export function toTexPreview(value: string): string | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  try {
    return parse(normalizeMathInput(trimmed)).toTex();
  } catch {
    return null;
  }
}
