const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5174/api'

/**
 * Thin fetch wrapper for the Sonari API.
 *
 * `credentials: 'include'` sends (and stores) the httpOnly auth
 * cookie on every request — the token never touches JavaScript.
 *
 * Throws an Error with the server's message on any non-2xx response.
 */
async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`)
  }
  return data
}

/**
 * Multipart upload. We deliberately do NOT set Content-Type — the
 * browser sets `multipart/form-data` with the correct boundary itself.
 */
async function uploadRequest(path, formData) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || `Upload failed (${res.status})`)
  }
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => uploadRequest(path, formData),
}
