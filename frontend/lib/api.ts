const API_URL = '/api';

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
};

export const authAPI = {
  login: async (userId: string, password: string) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    });
  },

  logout: async () => {
    const res = await apiRequest('/auth/logout', { method: 'POST' });
    localStorage.removeItem('userName');
    localStorage.removeItem('savedUsername');
    return res;
  },

  getMe: async () => {
    return apiRequest('/auth/me');
  },
};

export const ocrAPI = {
  processImage: async (imageData: string, slipType: string) => {
    return apiRequest('/ocr/process-base64', {
      method: 'POST',
      body: JSON.stringify({
        image: imageData,
        slipType,
        usePreprocessing: true,
        useHighDetail: slipType === '計量伝票' || slipType === '検量書',
      }),
    });
  },
};

export const slipsAPI = {
  submit: async (slipData: any) => {
    return apiRequest('/slips', {
      method: 'POST',
      body: JSON.stringify(slipData),
    });
  },
};
