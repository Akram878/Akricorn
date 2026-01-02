import { API_BASE_URL } from '../config/api.config';

export const resolveMediaUrl = (url: string, apiBaseUrl: string = API_BASE_URL): string => {
  if (!url) {
    return url;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const normalizedBase = apiBaseUrl.replace(/\/+$/, '');
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;

  return `${normalizedBase}${normalizedPath}`;
};
export const appendAuthToken = (url: string, token: string | null): string => {
  if (!url || !token) {
    return url;
  }

  if (url.includes('token=')) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};
