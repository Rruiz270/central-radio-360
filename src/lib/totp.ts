import { createHmac, randomBytes } from 'crypto';

/* TOTP RFC 6238 (SHA-1, 6 dígitos, 30s) — sem dependências externas */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateSecret(): string {
  const bytes = randomBytes(20);
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function b32decode(s: string): Buffer {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of s.replace(/=+$/, '').toUpperCase()) {
    const idx = B32.indexOf(c);
    if (idx < 0) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

function hotp(secret: string, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', b32decode(secret)).update(buf).digest();
  const offset = h[h.length - 1] & 0xf;
  const code = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

export function verifyTotp(secret: string, code: string, windowSteps = 1): boolean {
  const step = Math.floor(Date.now() / 1000 / 30);
  const clean = code.replace(/\D/g, '');
  for (let i = -windowSteps; i <= windowSteps; i++) {
    if (hotp(secret, step + i) === clean) return true;
  }
  return false;
}

export function otpauthUri(secret: string, email: string): string {
  return `otpauth://totp/Central360:${encodeURIComponent(email)}?secret=${secret}&issuer=Central360&digits=6&period=30`;
}
