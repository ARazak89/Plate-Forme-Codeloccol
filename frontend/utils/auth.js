export function getAuthToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}
