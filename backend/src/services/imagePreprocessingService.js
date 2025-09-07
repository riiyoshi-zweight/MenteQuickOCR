import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

class ImagePreprocessingService {
  constructor() {
    this.maxDimension = 2048; // OpenAI Vision APIの推奨サイズ
    this.minDimension = 1024; // 最小解像度
  }

  async preprocessImage(imagePath, options = {}) {
    const {
      slipType,
      deskew = true,
      denoise = true,
      enhanceText = true,
      removeShadows = false,
      binarize = false
    } = options;

    try {
      logger.info(`高度な画像前処理開始: ${imagePath}`);
      logger.info(`伝票タイプ: ${slipType || '不明'}`);

      let image = sharp(imagePath);
      const metadata = await image.metadata();
      
      logger.info(`元画像サイズ: ${metadata.width}x${metadata.height}`);

      // 1. リサイズ（大きすぎる画像は処理時間がかかるため）
      image = await this.smartResize(image, metadata);

      // 2. 回転補正（EXIFデータに基づく）
      image = image.rotate();

      // 3. ノイズ除去
      if (denoise) {
        image = await this.denoiseImage(image);
      }

      // 4. 影の除去（必要に応じて）
      if (removeShadows) {
        image = await this.removeShadows(image);
      }

      // 5. テキスト強調
      if (enhanceText) {
        image = await this.enhanceTextContrast(image);
      }

      // 6. 伝票タイプ別の最適化
      if (slipType) {
        image = await this.optimizeForSlipType(image, slipType);
      }

      // 7. 適応的二値化（オプション）
      if (binarize) {
        image = await this.adaptiveBinarization(image);
      }

      // 8. 最終的なシャープ化
      image = await this.finalSharpening(image);

      // 処理済み画像を保存
      const processedDir = path.dirname(imagePath);
      const processedName = `processed_${Date.now()}_${path.basename(imagePath)}`;
      const processedPath = path.join(processedDir, processedName);

      await image.jpeg({ quality: 95 }).toFile(processedPath);
      
      logger.info(`高度な前処理済み画像を保存: ${processedPath}`);
      return processedPath;

    } catch (error) {
      logger.error(`高度な画像前処理エラー: ${error.message}`);
      return imagePath; // エラーの場合は元の画像パスを返す
    }
  }

  async smartResize(image, metadata) {
    const { width, height } = metadata;

    if (width <= this.maxDimension && height <= this.maxDimension &&
        width >= this.minDimension && height >= this.minDimension) {
      return image;
    }

    let newWidth, newHeight;
    if (width > this.maxDimension || height > this.maxDimension) {
      const scale = Math.min(
        this.maxDimension / width,
        this.maxDimension / height
      );
      newWidth = Math.round(width * scale);
      newHeight = Math.round(height * scale);
    } else if (width < this.minDimension && height < this.minDimension) {
      const scale = Math.max(
        this.minDimension / width,
        this.minDimension / height
      );
      newWidth = Math.round(width * scale);
      newHeight = Math.round(height * scale);
    }

    logger.info(`画像をリサイズ: ${width}x${height} → ${newWidth}x${newHeight}`);
    return image.resize(newWidth, newHeight, {
      fit: 'inside',
      withoutEnlargement: false
    });
  }

  async denoiseImage(image) {
    logger.info('ノイズ除去処理中...');
    // Sharpのmedianフィルタを使用（3x3のカーネルサイズ）
    return image.median(3);
  }

  async removeShadows(image) {
    logger.info('影の除去処理中...');
    // 明度を上げて影を軽減
    return image
      .modulate({
        brightness: 1.2,
        saturation: 0.8
      })
      .normalize(); // ヒストグラムを正規化
  }

  async enhanceTextContrast(image) {
    logger.info('テキスト強調処理中...');
    
    // コントラストと明度を調整
    return image
      .modulate({
        brightness: 1.1,
        saturation: 0.9
      })
      .linear(1.5, -(128 * 1.5) + 128) // コントラスト強調
      .sharpen(); // シャープ化
  }

  async optimizeForSlipType(image, slipType) {
    logger.info(`伝票タイプ別最適化: ${slipType}`);

    switch (slipType) {
      case '受領証':
        // 赤枠強調、テーブル構造の明確化
        return image
          .modulate({ saturation: 1.2 }) // 色彩強調
          .sharpen({ sigma: 1.5 });

      case '検量書':
        // 手書き文字対応、表形式の強調
        return image
          .normalize()
          .sharpen({ sigma: 2 })
          .threshold(240, { grayscale: false }); // 背景ノイズ除去

      case '計量伝票':
        // 青背景対応
        return image
          .modulate({ 
            brightness: 1.3,
            saturation: 0.7 
          })
          .normalize();

      case '計量票':
        // 影除去済みなので、追加の最適化
        return image
          .clahe({ // 適応的ヒストグラム均等化
            width: 3,
            height: 3,
            maxSlope: 3
          });

      default:
        return image;
    }
  }

  async adaptiveBinarization(image) {
    logger.info('適応的二値化処理中...');
    
    // グレースケール変換後、適応的閾値処理
    return image
      .grayscale()
      .threshold(128, { grayscale: true })
      .negate(); // 必要に応じて反転
  }

  async finalSharpening(image) {
    logger.info('最終シャープ化処理中...');
    
    // アンシャープマスク
    return image.sharpen({
      sigma: 1,
      m1: 1,
      m2: 0.5,
      x1: 2,
      y2: 10,
      y3: 20
    });
  }

  async imageToBase64(imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      logger.error(`画像のBase64変換エラー: ${error.message}`);
      throw error;
    }
  }

  async saveProcessedImage(imageBuffer, originalPath) {
    const processedDir = path.dirname(originalPath);
    const processedName = `processed_${Date.now()}_${path.basename(originalPath)}`;
    const processedPath = path.join(processedDir, processedName);

    await fs.writeFile(processedPath, imageBuffer);
    return processedPath;
  }

  // 画像の品質チェック
  async checkImageQuality(imagePath) {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const stats = await image.stats();

      const quality = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        channels: metadata.channels,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        isProgressive: metadata.isProgressive,
        brightness: stats.channels[0].mean, // 明度の平均
        contrast: stats.channels[0].stdev,   // 標準偏差（コントラストの指標）
      };

      // 品質スコアを計算
      let score = 100;
      
      // 解像度チェック
      if (quality.width < 800 || quality.height < 600) {
        score -= 20;
        quality.warnings = quality.warnings || [];
        quality.warnings.push('解像度が低い可能性があります');
      }

      // 明度チェック
      if (quality.brightness < 50) {
        score -= 15;
        quality.warnings = quality.warnings || [];
        quality.warnings.push('画像が暗すぎる可能性があります');
      } else if (quality.brightness > 200) {
        score -= 15;
        quality.warnings = quality.warnings || [];
        quality.warnings.push('画像が明るすぎる可能性があります');
      }

      // コントラストチェック
      if (quality.contrast < 30) {
        score -= 10;
        quality.warnings = quality.warnings || [];
        quality.warnings.push('コントラストが低い可能性があります');
      }

      quality.score = score;
      quality.needsPreprocessing = score < 80;

      return quality;
    } catch (error) {
      logger.error(`画像品質チェックエラー: ${error.message}`);
      return {
        score: 0,
        needsPreprocessing: true,
        error: error.message
      };
    }
  }

  // 画像の自動クロップ（余白除去）
  async autoCrop(imagePath) {
    try {
      const image = sharp(imagePath);
      
      // 余白を自動的にトリミング
      const trimmed = await image
        .trim({ 
          threshold: 10 // 余白とみなす色の閾値
        })
        .toBuffer();

      return trimmed;
    } catch (error) {
      logger.error(`自動クロップエラー: ${error.message}`);
      throw error;
    }
  }

  // 画像の回転補正（テキストの向きを検出）
  async correctRotation(imagePath) {
    try {
      // 注: 実際のテキスト向き検出には別途OCRライブラリが必要
      // ここでは基本的なEXIF回転のみ対応
      const image = sharp(imagePath);
      return image.rotate();
    } catch (error) {
      logger.error(`回転補正エラー: ${error.message}`);
      throw error;
    }
  }
}

export const imagePreprocessingService = new ImagePreprocessingService();