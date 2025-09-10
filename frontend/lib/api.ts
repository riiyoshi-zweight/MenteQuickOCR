const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
  
  logout: async () => {
    const response = await apiRequest('/auth/logout', {
      method: 'POST',
    });
    setAuthToken(null);
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
  
  checkQuality: async (imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return fetch(`${API_URL}/ocr/check-quality`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: formData,
    }).then(res => res.json());
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
  
  checkDuplicate: async (date: string, clientName: string, weight: number) => {
    return apiRequest('/slips/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ date, clientName, weight }),
    });
  },
  
  getList: async (filters?: any) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`/slips${params ? `?${params}` : ''}`);
  },
  
  getStatistics: async (filters?: any) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`/slips/statistics${params ? `?${params}` : ''}`);
  },
};

// クライアントAPI
export const clientsAPI = {
  getClients: async () => {
    return apiRequest('/clients');
  },
  
  getWorkers: async () => {
    return apiRequest('/clients/workers');
  },
};

// エラーハンドリング
export class APIError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'APIError';
  }
}

// 初期化（トークンの復元）
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('authToken');
  if (token) {
    authToken = token;
  }
}