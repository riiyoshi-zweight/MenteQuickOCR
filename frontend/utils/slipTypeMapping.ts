// 得意先名から伝票タイプを判定するマッピング
export function getSlipTypeFromClient(clientName: string): string {
  // 得意先名を正規化（スペースや特殊文字を除去）
  const normalizedName = clientName.replace(/\s+/g, '').toLowerCase();
  
  // アース富山 → 計量票
  if (normalizedName.includes('アース富山') || normalizedName.includes('あーす富山') || 
      normalizedName.includes('earth富山') || normalizedName.includes('アースとやま')) {
    return '計量票';
  }
  
  // アース長野 → 計量伝票
  if (normalizedName.includes('アース長野') || normalizedName.includes('あーす長野') || 
      normalizedName.includes('earth長野') || normalizedName.includes('アースながの')) {
    return '計量伝票';
  }
  
  // Jマテバイオ → 検量書
  if (normalizedName.includes('jマテバイオ') || normalizedName.includes('jまてばいお') ||
      normalizedName.includes('ジェイマテバイオ') || normalizedName.includes('じぇいまてばいお') ||
      normalizedName.includes('jmatebio')) {
    return '検量書';
  }
  
  // 環境開発 → 受領証
  if (normalizedName.includes('環境開発') || normalizedName.includes('かんきょうかいはつ') ||
      normalizedName.includes('新潟環境開発')) {
    return '受領証';
  }
  
  // ブルボン → 受領証（受領証の得意先として記載されている）
  if (normalizedName.includes('ブルボン') || normalizedName.includes('ぶるぼん') ||
      normalizedName.includes('bourbon')) {
    return '受領証';
  }
  
  // デフォルトは受領証
  return '受領証';
}

// OCRから読み取った会社名から伝票タイプを判定
export function getSlipTypeFromOCRCompany(companyName: string): string {
  // 会社名から伝票タイプを判定
  // OCRで読み取った画像の発行元会社から判定
  const normalizedName = companyName.replace(/\s+/g, '').toLowerCase();
  
  // 新潟環境開発 → 受領証を発行
  if (normalizedName.includes('新潟環境開発') || normalizedName.includes('環境開発')) {
    return '受領証';
  }
  
  // 上越マテリアル → 検量書を発行
  if (normalizedName.includes('上越マテリアル') || normalizedName.includes('じょうえつまてりある')) {
    return '検量書';
  }
  
  // その他の計量システム関連
  if (normalizedName.includes('アース富山')) {
    return '計量票';
  }
  
  if (normalizedName.includes('アース長野')) {
    return '計量伝票';
  }
  
  if (normalizedName.includes('jマテバイオ')) {
    return '検量書';
  }
  
  // デフォルト
  return '受領証';
}