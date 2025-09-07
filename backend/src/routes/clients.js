import express from 'express';
import { supabaseService } from '../services/supabaseService.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';

const router = express.Router();

// 得意先一覧取得
router.get('/', authMiddleware, async (req, res) => {
  try {
    const clients = await supabaseService.getClients();
    
    res.json({
      success: true,
      data: clients
    });
    
  } catch (error) {
    logger.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      error: '得意先情報の取得に失敗しました'
    });
  }
});

// 得意先追加（管理者のみ）
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required().min(1).max(200),
      code: Joi.string().allow('', null).max(50),
      displayOrder: Joi.number().integer().min(0).default(999)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const newClient = await supabaseService.addClient(value);

    res.json({
      success: true,
      data: newClient,
      message: '得意先を追加しました'
    });

  } catch (error) {
    logger.error('Add client error:', error);
    res.status(500).json({
      success: false,
      error: '得意先の追加に失敗しました'
    });
  }
});

// 作業者一覧取得
router.get('/workers', authMiddleware, async (req, res) => {
  try {
    const workers = await supabaseService.getWorkers();
    
    res.json({
      success: true,
      data: workers
    });
    
  } catch (error) {
    logger.error('Get workers error:', error);
    res.status(500).json({
      success: false,
      error: '作業者情報の取得に失敗しました'
    });
  }
});

// 作業者追加（管理者のみ）
router.post('/workers', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const schema = Joi.object({
      userId: Joi.string().required().min(1).max(50),
      name: Joi.string().required().min(1).max(100),
      password: Joi.string().required().min(6).max(100)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const newWorker = await supabaseService.addWorker(value);

    res.json({
      success: true,
      data: {
        id: newWorker.id,
        userId: newWorker.user_id,
        name: newWorker.name
      },
      message: '作業者を追加しました'
    });

  } catch (error) {
    logger.error('Add worker error:', error);
    res.status(500).json({
      success: false,
      error: '作業者の追加に失敗しました'
    });
  }
});

export default router;