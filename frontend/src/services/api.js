const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('vaultai_token') || sessionStorage.getItem('vaultai_token');
}

export function setAuthToken(token, remember = true) {
  if (remember) {
    localStorage.setItem('vaultai_token', token);
  } else {
    sessionStorage.setItem('vaultai_token', token);
  }
}

export function clearAuthToken() {
  localStorage.removeItem('vaultai_token');
  sessionStorage.removeItem('vaultai_token');
}

export function getUserInfo() {
  const raw = localStorage.getItem('vaultai_user') || sessionStorage.getItem('vaultai_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUserInfo(user, remember = true) {
  const payload = JSON.stringify(user);
  if (remember) {
    localStorage.setItem('vaultai_user', payload);
  } else {
    sessionStorage.setItem('vaultai_user', payload);
  }
}

export function clearUserInfo() {
  localStorage.removeItem('vaultai_user');
  sessionStorage.removeItem('vaultai_user');
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'An error occurred during API request.');
  }

  return data;
}

export const api = {
  // Auth endpoints
  signup: (name, email, password) =>
    request('/auth/signup', {
      method: 'POST',
      body: { name, email, password }
    }),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: { email, password }
    }),

  getMe: () => request('/auth/me'),

  // Folder endpoints
  getFolders: () => request('/folders'),

  createFolder: (name) =>
    request('/folders', {
      method: 'POST',
      body: { name }
    }),

  updateFolder: (id, name) =>
    request(`/folders/${id}`, {
      method: 'PUT',
      body: { name }
    }),

  deleteFolder: (id) =>
    request(`/folders/${id}`, {
      method: 'DELETE'
    }),

  // Document endpoints
  getDocuments: (params = {}) => {
    const query = new URLSearchParams();
    if (params.folderId) query.append('folderId', params.folderId);
    if (params.folderName) query.append('folderName', params.folderName);
    if (params.type) query.append('type', params.type);
    if (params.search) query.append('search', params.search);
    const qStr = query.toString();
    return request(`/documents${qStr ? `?${qStr}` : ''}`);
  },

  uploadDocument: (formData) =>
    request('/documents/upload', {
      method: 'POST',
      body: formData // FormData will automatically set content-type header
    }),

  deleteDocument: (id) =>
    request(`/documents/${id}`, {
      method: 'DELETE'
    })
};
