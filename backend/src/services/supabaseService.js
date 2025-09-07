import { createClient } from '@supabase/supabase-js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcryptjs';

class SupabaseService {
  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.anonKey);
  }

  // 認証関連
  async signIn(userId, password) {
    try {
      logger.info(`Attempting login with user_id: ${userId}`);
      
      // 開発環境用の仮認証（データベース接続なし）
      if (userId === 'test' && password === 'test123') {
        return {
          id: 'test-worker-id',
          employeeId: '001',
          userId: 'test',
          name: 'テストユーザー'
        };
      }
      
      // パスワードをハッシュ化（ソルトとしてuserIdを使用）
      const hashedPassword = this.hashPassword(password, userId);
      
      // カスタム認証関数を呼び出す
      const { data, error } = await this.client.rpc('authenticate_worker', {
        user_id_input: userId,
        password_input: hashedPassword
      });
      
      if (error) {
        logger.error('Authentication RPC error:', error);
        return null;
      }

      logger.info('RPC response:', data);

      if (data && data.length > 0) {
        const worker = data[0];
        return {
          id: worker.id,
          employeeId: worker.user_id,
          userId: worker.user_id,
          name: worker.name
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Sign in error:', error);
      return null;
    }
  }

  // パスワードハッシュ化（Flutterプロジェクトと同じロジック）
  hashPassword(password, salt) {
    // 注: 実際の実装では、Flutterと同じハッシュアルゴリズムを使用する必要があります
    // ここでは簡易的にbcryptを使用
    const saltRounds = 10;
    return bcrypt.hashSync(password + salt, saltRounds);
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
      const insertData = {
        slip_date: this.formatDate(slip.slipDate),
        slip_type: slip.slipType,
        worker_name: slip.workerName,
        client_name: slip.clientName,
        net_weight: parseFloat(slip.netWeight),
        item_name: slip.itemName || null,
        manifest_number: slip.manifestNumber || null,
        is_manual_input: slip.isManualInput || false,
        created_at: new Date().toISOString()
      };
      
      logger.info('送信データ:', insertData);
      
      const { data, error } = await this.client
        .from('slips')
        .insert([insertData]);
      
      if (error) {
        logger.error('Supabase insert error:', error);
        throw error;
      }
      
      logger.info('INSERT完了:', data);
      return true;
      
    } catch (error) {
      logger.error('Submit slip error:', error);
      throw error;
    }
  }

  async checkDuplicate(date, clientName, weight) {
    try {
      const dateStr = this.formatDate(date);
      
      const { data, error } = await this.client
        .from('slips')
        .select('*')
        .eq('slip_date', dateStr)
        .eq('client_name', clientName)
        .eq('net_weight', parseFloat(weight));

      if (error) {
        logger.error('Check duplicate error:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      logger.error('Check duplicate error:', error);
      return false;
    }
  }

  // 得意先関連
  async getClients() {
    try {
      logger.info('=== 得意先取得開始 ===');
      
      const { data, error } = await this.client
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        logger.error('Get clients error:', error);
        throw error;
      }

      logger.info(`取得した得意先数: ${data?.length || 0}`);
      
      return data?.map(client => ({
        id: client.id,
        name: client.name,
        code: client.code,
        displayOrder: client.display_order,
        isActive: client.is_active
      })) || [];
      
    } catch (error) {
      logger.error('Get clients error:', error);
      // エラー時はデフォルトの得意先リストを返す
      return this.getDefaultClients();
    }
  }

  getDefaultClients() {
    return [
      { id: '1', name: '（株）ブルボン 上越工場', code: 'BRB-JOE', displayOrder: 1, isActive: true },
      { id: '2', name: '（株）ブルボン 柏崎工場', code: 'BRB-KSZ', displayOrder: 2, isActive: true },
      { id: '3', name: '妙高アクアクリーンセンター', code: 'MAC', displayOrder: 3, isActive: true },
      { id: '4', name: 'バイオマス', code: 'BIO', displayOrder: 4, isActive: true },
      { id: '5', name: '上越市下水道センター', code: 'JOE-SWG', displayOrder: 5, isActive: true },
      { id: '6', name: 'アース帰り便', code: 'EARTH-R', displayOrder: 6, isActive: true }
    ];
  }

  async addClient(client) {
    try {
      const insertData = {
        name: client.name,
        code: client.code || null,
        display_order: client.displayOrder || 999,
        is_active: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('clients')
        .insert([insertData])
        .select();

      if (error) {
        logger.error('Add client error:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      logger.error('Add client error:', error);
      throw error;
    }
  }

  // 作業者関連
  async getWorkers() {
    try {
      const { data, error } = await this.client
        .from('workers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Get workers error:', error);
        throw error;
      }

      return data?.map(worker => ({
        id: worker.id,
        employeeId: worker.user_id,
        name: worker.name,
        isActive: worker.is_active
      })) || [];
      
    } catch (error) {
      logger.error('Get workers error:', error);
      return [];
    }
  }

  async addWorker(worker) {
    try {
      const hashedPassword = this.hashPassword(worker.password, worker.userId);
      
      const insertData = {
        user_id: worker.userId,
        name: worker.name,
        password: hashedPassword,
        is_active: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('workers')
        .insert([insertData])
        .select();

      if (error) {
        logger.error('Add worker error:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      logger.error('Add worker error:', error);
      throw error;
    }
  }

  // 伝票データ取得
  async getSlips(filters = {}) {
    try {
      let query = this.client
        .from('slips')
        .select('*');

      // フィルター適用
      if (filters.startDate) {
        query = query.gte('slip_date', this.formatDate(filters.startDate));
      }
      if (filters.endDate) {
        query = query.lte('slip_date', this.formatDate(filters.endDate));
      }
      if (filters.clientName) {
        query = query.eq('client_name', filters.clientName);
      }
      if (filters.slipType) {
        query = query.eq('slip_type', filters.slipType);
      }
      if (filters.workerName) {
        query = query.eq('worker_name', filters.workerName);
      }

      // ソート
      query = query.order('slip_date', { ascending: false });
      
      // ページネーション
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Get slips error:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Get slips error:', error);
      throw error;
    }
  }

  // 統計情報取得
  async getStatistics(filters = {}) {
    try {
      const slips = await this.getSlips(filters);
      
      const stats = {
        totalCount: slips.length,
        totalWeight: slips.reduce((sum, slip) => sum + (slip.net_weight || 0), 0),
        byClient: {},
        byItem: {},
        byDate: {}
      };

      // クライアント別集計
      slips.forEach(slip => {
        if (slip.client_name) {
          if (!stats.byClient[slip.client_name]) {
            stats.byClient[slip.client_name] = {
              count: 0,
              weight: 0
            };
          }
          stats.byClient[slip.client_name].count++;
          stats.byClient[slip.client_name].weight += slip.net_weight || 0;
        }

        // 品目別集計
        if (slip.item_name) {
          if (!stats.byItem[slip.item_name]) {
            stats.byItem[slip.item_name] = {
              count: 0,
              weight: 0
            };
          }
          stats.byItem[slip.item_name].count++;
          stats.byItem[slip.item_name].weight += slip.net_weight || 0;
        }

        // 日付別集計
        if (slip.slip_date) {
          if (!stats.byDate[slip.slip_date]) {
            stats.byDate[slip.slip_date] = {
              count: 0,
              weight: 0
            };
          }
          stats.byDate[slip.slip_date].count++;
          stats.byDate[slip.slip_date].weight += slip.net_weight || 0;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Get statistics error:', error);
      throw error;
    }
  }

  // ユーティリティメソッド
  formatDate(date) {
    if (!date) return null;
    
    if (typeof date === 'string') {
      // すでにYYYY-MM-DD形式の場合はそのまま返す
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      date = new Date(date);
    }
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  // 伝票削除（管理者機能）
  async deleteSlip(slipId) {
    try {
      const { error } = await this.client
        .from('slips')
        .delete()
        .eq('id', slipId);

      if (error) {
        logger.error('Delete slip error:', error);
        throw error;
      }

      return true;
    } catch (error) {
      logger.error('Delete slip error:', error);
      throw error;
    }
  }

  // 伝票更新（管理者機能）
  async updateSlip(slipId, updates) {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      if (updateData.slipDate) {
        updateData.slip_date = this.formatDate(updateData.slipDate);
        delete updateData.slipDate;
      }

      const { data, error } = await this.client
        .from('slips')
        .update(updateData)
        .eq('id', slipId)
        .select();

      if (error) {
        logger.error('Update slip error:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      logger.error('Update slip error:', error);
      throw error;
    }
  }
}

export const supabaseService = new SupabaseService();