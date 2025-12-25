export const API_BASE_URL: string =
  (window as { __API_BASE_URL__?: string }).__API_BASE_URL__ || 'https://localhost:7150';
