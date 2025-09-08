import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '../utils/logger.js';

class SupabaseService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials are not configured');
    }
    
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  // 認証関連
  async signIn(userId, password) {
    try {
      // workersテーブルから直接ユーザー情報を取得
      const { data: workers, error } = await this.client
        .from('workers')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error || !workers) {
        logger.error('Worker not found:', error);
        return null;
      }
      
      logger.info('Worker found:', { userId: workers.user_id, name: workers.name });
      
      // パスワード検証 - FlutterのSHA256ハッシュ化と同じロジック
      const hashedPassword = this.hashPassword(password, userId);
      
      logger.info('Password verification:', {
        userId,
        inputPasswordHash: hashedPassword,
        storedPasswordHash: workers.password_hash ? workers.password_hash.substring(0, 10) + '...' : 'no password_hash field'
      });
      
      // password_hashフィールドと比較
      if (workers.password_hash === hashedPassword) {
        return {
          id: workers.id,
          employeeId: workers.user_id,
          userId: workers.user_id,
          name: workers.name
        };
      }
      
      logger.error('Password mismatch for user:', userId);
      return null;
      
    } catch (error) {
      logger.error('Sign in error:', error);
      return null;
    }
  }

  // パスワードハッシュ化（Flutterプロジェクトと同じロジック）
  hashPassword(password, userId) {
    const salt = userId.toLowerCase();
    const hash = crypto.createHash('sha256');
    hash.update(salt + password);
    return hash.digest('hex');
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) {
      logger.error('Sign out error:', error);
      throw error;
    }
  }

  // 伝票関連
  async submitSlip(slip) {
    try {
      // まず重複チェック
      const isDuplicate = await this.checkDuplicate(
        slip.slipDate,
        slip.clientName,
        slip.netWeight
      );

      if (isDuplicate) {
        throw new Error('重複する伝票が既に存在します');
      }

      // 登録データを構築
      const slipData = {
        company_name: slip.companyName,
        slip_date: slip.slipDate,
        slip_type: slip.slipType,
        slip_number: slip.slipNumber,
        vehicle_number: slip.vehicleNumber,
        client_name: slip.clientName,
        client_id: slip.clientId,
        product_name: slip.productName,
        unit_price: slip.unitPrice,
        unit: slip.unit,
        quantity: slip.quantity,
        gross_weight: slip.grossWeight,
        tare_weight: slip.tareWeight,
        net_weight: slip.netWeight,
        total_weight: slip.totalWeight,
        notes: slip.notes,
        site_name: slip.siteName,
        worker_name: slip.workerName,
        created_at: new Date().toISOString()
      };

      // テーブルの判定
      const tableName = this.getTableName(slip.slipType, slip.companyName);
      
      const { data, error } = await this.client
        .from(tableName)
        .insert([slipData]);

      if (error) {
        logger.error('Slip submission error:', error);
        throw error;
      }

      logger.info('Slip submitted successfully:', data);
      return true;
    } catch (error) {
      logger.error('Submit slip error:', error);
      throw error;
    }
  }

  getTableName(slipType, companyName) {
    // 自社入力の場合
    if (slipType === '自社入力' || slipType === 'selfinput') {
      return 'selfinput';
    }
    
    // 会社別のテーブル名マッピング
    const companyTableMap = {
      'J&T環境株式会社': 'jt_slips',
      'アースサポート株式会社': 'earth_support_slips',
      'アース環境開発株式会社': 'earth_kankyo_slips',
      '有限会社ジェイエムエイト': 'jm8_slips'
    };
    
    return companyTableMap[companyName] || 'slips';
  }

  async checkDuplicate(slipDate, clientName, netWeight) {
    try {
      // 各テーブルをチェック
      const tables = ['slips', 'jt_slips', 'earth_support_slips', 'earth_kankyo_slips', 'jm8_slips', 'selfinput'];
      
      for (const table of tables) {
        const { data, error } = await this.client
          .from(table)
          .select('id')
          .eq('slip_date', slipDate)
          .eq('client_name', clientName)
          .eq('net_weight', netWeight)
          .limit(1);
        
        if (!error && data && data.length > 0) {
          logger.info(`Duplicate found in ${table}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Duplicate check error:', error);
      return false;
    }
  }

  // 得意先関連
  async getClients() {
    try {
      const { data, error } = await this.client
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) {
        logger.error('Get clients error:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      logger.error('Get clients error:', error);
      throw error;
    }
  }

  // その他のメソッド...
}

export const supabaseService = new SupabaseService();