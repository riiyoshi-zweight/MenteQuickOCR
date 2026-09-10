export interface PolicyResult {
  valid: boolean;
  errors: string[];
}

const MIN_LENGTH = 8;

export function validatePassword(password: string): PolicyResult {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`${MIN_LENGTH}文字以上で入力してください`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push('英小文字を含めてください');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('英大文字を含めてください');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('数字を含めてください');
  }

  return { valid: errors.length === 0, errors };
}
