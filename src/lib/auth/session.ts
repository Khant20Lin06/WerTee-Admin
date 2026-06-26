// Server-side session helper.
// Reads the JWT payload from the token stored in the request cookie/header.
// We do NOT verify the signature here (Edge Runtime has no crypto for RSA/ECDSA).
// Signature verification happens on the backend on every API call via Bearer token.
// This is only used for client-side role display / guard decisions that the backend
// already re-validates on each request anyway.

export type SessionUser = {
  id: string;
  role: 'admin' | 'ops' | 'support';
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getSessionUserFromToken(token: string): SessionUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const id   = typeof payload['sub']  === 'string' ? payload['sub']  : null;
  const role = typeof payload['role'] === 'string' ? payload['role'].toLowerCase() : null;

  if (!id) return null;
  if (role !== 'admin' && role !== 'ops' && role !== 'support') return null;

  return { id, role };
}
