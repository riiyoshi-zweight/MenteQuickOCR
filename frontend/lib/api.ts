const API_URL = '/api';

// 認証トークンの管理
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = (): string | null => {
  if (!authToken) {
    authToken = localStorage.getItem('authToken');
  }
  return authToken;
};

// APIリクエストのヘルパー関数
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || 'API request failed');
  }
  
  return response.json();
};

// 認証API
export const authAPI = {
  login: async (userId: string, password: string) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    });
    
    if (response.success && response.data.token) {
      setAuthToken(response.data.token);
    }
    
    return response;
  },
  
  getMe: async () => {
    return apiRequest('/auth/me');
  },
};

// OCR API
export const ocrAPI = {
  processImage: async (imageData: string, slipType: string) => {
    console.log('OCR API呼び出し開始:', { slipType });
    
    try {
      const response = await apiRequest('/ocr/process-base64', {
        method: 'POST',
        body: JSON.stringify({
          image: imageData,
          slipType,
          usePreprocessing: true,
          useHighDetail: slipType === '計量伝票' || slipType === '検量書',
        }),
      });
      
      console.log('OCR APIレスポンス:', response);
      return response;
    } catch (error) {
      console.error('OCR APIエラー:', error);
      throw error;
    }
  },
  
};

// 伝票API
export const slipsAPI = {
  submit: async (slipData: any) => {
    return apiRequest('/slips', {
      method: 'POST',
      body: JSON.stringify(slipData),
    });
  },
  
};

// 初期化（トークンの復元）
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('authToken');
  if (token) {
    authToken = token;
  }
}