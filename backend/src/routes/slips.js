import express from 'express';
import { supabaseService } from '../services/supabaseService.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { logger, logDatabase } from '../utils/logger.js';
import Joi from 'joi';

const router = express.Router();

// 伝票登録
router.post('/', authMiddleware, async (req, res) => {
  try {
    const schema = Joi.object({
      slipDate: Joi.date().required(),
      slipType: Joi.string().required().valid('受領証', '検量書', '計量伝票', '計量票'),
      clientName: Joi.string().required().min(1).max(200),
      netWeight: Joi.number().required().min(0).max(999999),
      itemName: Joi.string().allow('', null).max(200),
      manifestNumber: Joi.string().allow('', null).max(20),
      isManualInput: Joi.boolean().default(false)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    // 作業者名を追加
    const slipData = {
      ...value,
      workerName: req.user.name
    };

    logDatabase('insert', 'slips', {
      userId: req.user.userId,
      slipType: slipData.slipType
    });

    const success = await supabaseService.submitSlip(slipData);

    if (success) {
      res.json({
        success: true,
        message: '伝票を登録しました'
      });
    } else {
      res.status(400).json({
        success: false,
        error: '伝票の登録に失敗しました'
      });
    }

  } catch (error) {
    logger.error('Submit slip error:', error);
    
    if (error.message.includes('重複')) {
      return res.status(409).json({
        success: false,
        error: '同じ内容の伝票が既に登録されています'
      });
    }

    res.status(500).json({
      success: false,
      error: '伝票登録中にエラーが発生しました'
    });
  }
});

// 伝票一覧取得
router.get('/', authMiddleware, async (req, res) => {
  try {
    const schema = Joi.object({
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso(),
      clientName: Joi.string().max(200),
      slipType: Joi.string().valid('受領証', '検量書', '計量伝票', '計量票'),
      workerName: Joi.string().max(100),
      limit: Joi.number().integer().min(1).max(1000).default(100),
      offset: Joi.number().integer().min(0).default(0)
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    logDatabase('select', 'slips', {
      userId: req.user.userId,
      filters: value
    });

    const slips = await supabaseService.getSlips(value);

    res.json({
      success: true,
      data: slips
    });

  } catch (error) {
    logger.error('Get slips error:', error);
    res.status(500).json({
      success: false,
      error: '伝票取得中にエラーが発生しました'
    });
  }
});

// 重複チェック
router.post('/check-duplicate', authMiddleware, async (req, res) => {
  try {
    const schema = Joi.object({
      date: Joi.date().required(),
      clientName: Joi.string().required().min(1).max(200),
      weight: Joi.number().required().min(0)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const isDuplicate = await supabaseService.checkDuplicate(
      value.date,
      value.clientName,
      value.weight
    );

    res.json({
      success: true,
      data: {
        isDuplicate
      }
    });

  } catch (error) {
    logger.error('Check duplicate error:', error);
    res.status(500).json({
      success: false,
      error: '重複チェック中にエラーが発生しました'
    });
  }
});

// 統計情報取得
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const schema = Joi.object({
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso(),
      clientName: Joi.string().max(200),
      slipType: Joi.string().valid('受領証', '検量書', '計量伝票', '計量票'),
      workerName: Joi.string().max(100)
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const statistics = await supabaseService.getStatistics(value);

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      error: '統計情報取得中にエラーが発生しました'
    });
  }
});

// 伝票削除（管理者のみ）
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const slipId = req.params.id;

    if (!slipId) {
      return res.status(400).json({
        success: false,
        error: '伝票IDが指定されていません'
      });
    }

    logDatabase('delete', 'slips', {
      userId: req.user.userId,
      slipId
    });

    await supabaseService.deleteSlip(slipId);

    res.json({
      success: true,
      message: '伝票を削除しました'
    });

  } catch (error) {
    logger.error('Delete slip error:', error);
    res.status(500).json({
      success: false,
      error: '伝票削除中にエラーが発生しました'
    });
  }
});

// 伝票更新（管理者のみ）
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const slipId = req.params.id;

    const schema = Joi.object({
      slipDate: Joi.date(),
      slipType: Joi.string().valid('受領証', '検量書', '計量伝票', '計量票'),
      clientName: Joi.string().min(1).max(200),
      netWeight: Joi.number().min(0).max(999999),
      itemName: Joi.string().allow('', null).max(200),
      manifestNumber: Joi.string().allow('', null).max(20)
    }).min(1); // 少なくとも1つのフィールドが必要

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    logDatabase('update', 'slips', {
      userId: req.user.userId,
      slipId,
      updates: value
    });

    const updatedSlip = await supabaseService.updateSlip(slipId, value);

    res.json({
      success: true,
      data: updatedSlip
    });

  } catch (error) {
    logger.error('Update slip error:', error);
    res.status(500).json({
      success: false,
      error: '伝票更新中にエラーが発生しました'
    });
  }
});

// CSVエクスポート
router.get('/export/csv', authMiddleware, async (req, res) => {
  try {
    const schema = Joi.object({
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso(),
      clientName: Joi.string().max(200),
      slipType: Joi.string().valid('受領証', '検量書', '計量伝票', '計量票')
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const slips = await supabaseService.getSlips(value);

    // CSV形式に変換
    const headers = ['日付', '伝票タイプ', '得意先名', '品目', '正味重量', 'マニフェスト番号', '作業者'];
    const rows = slips.map(slip => [
      slip.slip_date,
      slip.slip_type,
      slip.client_name,
      slip.item_name || '',
      slip.net_weight,
      slip.manifest_number || '',
      slip.worker_name
    ]);

    // BOM付きUTF-8でCSVを生成
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="slips_export.csv"');
    res.send(csvContent);

  } catch (error) {
    logger.error('Export CSV error:', error);
    res.status(500).json({
      success: false,
      error: 'CSVエクスポート中にエラーが発生しました'
    });
  }
});

export default router;