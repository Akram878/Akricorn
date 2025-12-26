interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

const decodePayload = (token: string): JwtPayload | null => {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) {
      return null;
    }

    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
};

export const getTokenExpiry = (token: string): number | null => {
  const payload = decodePayload(token);
  if (!payload?.exp) {
    return null;
  }

  return payload.exp * 1000;
};

export const isTokenExpired = (token: string): boolean => {
  const expiry = getTokenExpiry(token);
  if (!expiry) {
    return true;
  }
  return Date.now() >= expiry;
};
