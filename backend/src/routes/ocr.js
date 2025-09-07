import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { ocrService, ContentNotReadableError } from '../services/ocrService.js';
import { imagePreprocessingService } from '../services/imagePreprocessingService.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger, logOCRProcess, PerformanceLogger } from '../utils/logger.js';
import Joi from 'joi';

const router = express.Router();

// Multer設定（ファイルアップロード）
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
    }
  }
});

// OCR処理エンドポイント
router.post('/process', authMiddleware, upload.single('image'), async (req, res) => {
  const perf = new PerformanceLogger('OCR処理');
  let tempFilePath = null;

  try {
    // リクエストバリデーション
    const schema = Joi.object({
      slipType: Joi.string().required().valid('受領証', '検量書', '計量伝票', '計量票'),
      usePreprocessing: Joi.boolean().default(true),
      useHighDetail: Joi.boolean().default(false)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '画像ファイルがアップロードされていません'
      });
    }

    tempFilePath = req.file.path;
    const { slipType, usePreprocessing, useHighDetail } = value;

    logOCRProcess(slipType, 'start', {
      userId: req.user.userId,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    // 画像品質チェック
    const quality = await imagePreprocessingService.checkImageQuality(tempFilePath);
    logger.info('画像品質スコア:', quality);

    if (quality.score < 50) {
      logOCRProcess(slipType, 'warning', {
        message: '画像品質が低い',
        quality
      });
    }

    // OCR処理実行
    const result = await ocrService.processSlipImage(tempFilePath, {
      slipType,
      usePreprocessing: usePreprocessing && quality.needsPreprocessing,
      useHighDetail,
      onProgress: (status) => {
        logger.info(`OCR進捗: ${status}`);
      }
    });

    // 処理時間を記録
    const duration = perf.end();

    logOCRProcess(slipType, 'success', {
      userId: req.user.userId,
      duration,
      hasResult: !!result
    });

    res.json({
      success: true,
      data: {
        ...result,
        processingTime: duration,
        imageQuality: quality
      }
    });

  } catch (error) {
    const duration = perf.end();

    if (error instanceof ContentNotReadableError) {
      logOCRProcess(req.body.slipType, 'error', {
        error: 'Content not readable',
        userId: req.user?.userId
      });

      return res.status(422).json({
        success: false,
        error: '画像の内容を読み取ることができませんでした。画像が鮮明であることを確認してください。',
        code: 'CONTENT_NOT_READABLE'
      });
    }

    logger.error('OCR processing error:', error);
    logOCRProcess(req.body.slipType || 'unknown', 'error', {
      error: error.message,
      userId: req.user?.userId,
      duration
    });

    res.status(500).json({
      success: false,
      error: 'OCR処理中にエラーが発生しました'
    });

  } finally {
    // 一時ファイルの削除
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        logger.info('一時ファイルを削除:', tempFilePath);
      } catch (err) {
        logger.warn('一時ファイル削除エラー:', err);
      }
    }
  }
});

// Base64画像でのOCR処理
router.post('/process-base64', authMiddleware, async (req, res) => {
  const perf = new PerformanceLogger('OCR処理(Base64)');
  let tempFilePath = null;

  try {
    const schema = Joi.object({
      image: Joi.string().required(),
      slipType: Joi.string().required().valid('受領証', '検量書', '計量伝票', '計量票'),
      usePreprocessing: Joi.boolean().default(true),
      useHighDetail: Joi.boolean().default(false)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { image, slipType, usePreprocessing, useHighDetail } = value;

    // Base64データから画像ファイルを作成
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    await fs.mkdir(uploadDir, { recursive: true });
    
    tempFilePath = path.join(uploadDir, `ocr-${Date.now()}.jpg`);
    await fs.writeFile(tempFilePath, buffer);

    logOCRProcess(slipType, 'start', {
      userId: req.user.userId,
      source: 'base64'
    });

    // OCR処理実行
    const result = await ocrService.processSlipImage(tempFilePath, {
      slipType,
      usePreprocessing,
      useHighDetail,
      onProgress: (status) => {
        logger.info(`OCR進捗: ${status}`);
      }
    });

    const duration = perf.end();

    logOCRProcess(slipType, 'success', {
      userId: req.user.userId,
      duration,
      hasResult: !!result
    });

    res.json({
      success: true,
      data: {
        ...result,
        processingTime: duration
      }
    });

  } catch (error) {
    const duration = perf.end();

    if (error instanceof ContentNotReadableError) {
      return res.status(422).json({
        success: false,
        error: '画像の内容を読み取ることができませんでした',
        code: 'CONTENT_NOT_READABLE'
      });
    }

    logger.error('OCR processing error:', error);
    logOCRProcess(req.body.slipType || 'unknown', 'error', {
      error: error.message,
      userId: req.user?.userId,
      duration
    });

    res.status(500).json({
      success: false,
      error: 'OCR処理中にエラーが発生しました'
    });

  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        logger.warn('一時ファイル削除エラー:', err);
      }
    }
  }
});

// 画像品質チェックエンドポイント
router.post('/check-quality', authMiddleware, upload.single('image'), async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '画像ファイルがアップロードされていません'
      });
    }

    tempFilePath = req.file.path;

    const quality = await imagePreprocessingService.checkImageQuality(tempFilePath);

    res.json({
      success: true,
      data: quality
    });

  } catch (error) {
    logger.error('Image quality check error:', error);
    res.status(500).json({
      success: false,
      error: '画像品質チェック中にエラーが発生しました'
    });

  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        logger.warn('一時ファイル削除エラー:', err);
      }
    }
  }
});

// 画像前処理エンドポイント（デバッグ用）
router.post('/preprocess', authMiddleware, upload.single('image'), async (req, res) => {
  let tempFilePath = null;
  let processedPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '画像ファイルがアップロードされていません'
      });
    }

    tempFilePath = req.file.path;

    const options = {
      slipType: req.body.slipType,
      deskew: req.body.deskew !== 'false',
      denoise: req.body.denoise !== 'false',
      enhanceText: req.body.enhanceText !== 'false',
      removeShadows: req.body.removeShadows === 'true',
      binarize: req.body.binarize === 'true'
    };

    processedPath = await imagePreprocessingService.preprocessImage(tempFilePath, options);

    // 処理後の画像をBase64で返す
    const processedBuffer = await fs.readFile(processedPath);
    const base64Image = processedBuffer.toString('base64');

    res.json({
      success: true,
      data: {
        processedImage: `data:image/jpeg;base64,${base64Image}`,
        originalSize: req.file.size,
        processedSize: processedBuffer.length
      }
    });

  } catch (error) {
    logger.error('Image preprocessing error:', error);
    res.status(500).json({
      success: false,
      error: '画像前処理中にエラーが発生しました'
    });

  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        logger.warn('一時ファイル削除エラー:', err);
      }
    }
    if (processedPath) {
      try {
        await fs.unlink(processedPath);
      } catch (err) {
        logger.warn('処理済みファイル削除エラー:', err);
      }
    }
  }
});

export default router;