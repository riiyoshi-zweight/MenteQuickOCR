import dotenv from 'dotenv';
dotenv.config();

// バックエンドのサービスをインポート
import { supabaseService } from '../../backend/src/services/supabaseService.js';
import { generateToken } from '../../backend/src/middleware/auth.js';

export const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      })
    };
  }

  try {
    const { userId, password } = JSON.parse(event.body);
    
    console.log('Login attempt for user:', userId);
    
    // Supabase認証
    const worker = await supabaseService.signIn(userId, password);
    
    if (!worker) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'ユーザーIDまたはパスワードが正しくありません'
        })
      };
    }
    
    const token = generateToken(worker);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          token,
          user: worker
        }
      })
    };
    
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'ログイン処理中にエラーが発生しました'
      })
    };
  }
};