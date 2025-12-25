export const isTokenExpired = (token: string): boolean => {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) {
      return true;
    }

    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));

    if (!payload?.exp) {
      return true;
    }

    const expiryMs = payload.exp * 1000;
    return Date.now() >= expiryMs;
  } catch {
    return true;
  }
};
