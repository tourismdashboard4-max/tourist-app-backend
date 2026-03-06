// ============================================
// Saudi National ID Validation (10 digits)
// ============================================
const validateSaudiID = (id) => {
  const idStr = id.toString();
  if (!/^\d{10}$/.test(idStr)) return false;
  
  // التحقق من خوارزمية الرقم الوطني السعودي
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(idStr[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

// ============================================
// License Number Validation (TRL-1234-5678)
// ============================================
const validateLicenseNumber = (license) => {
  return /^[A-Z]{3}-\d{4}-\d{4}$/.test(license);
};

// ============================================
// Saudi Phone Number Validation
// ============================================
const validateSaudiPhone = (phone) => {
  return /^(05|\+9665)[0-9]{8}$/.test(phone);
};

// ============================================
// Email Validation
// ============================================
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ============================================
// Password Strength Validation
// ============================================
const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('يجب أن تحتوي على حرف كبير واحد على الأقل');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('يجب أن تحتوي على حرف صغير واحد على الأقل');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('يجب أن تحتوي على رقم واحد على الأقل');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================
// Google Maps URL Validation
// ============================================
const validateGoogleMapsUrl = (url) => {
  if (!url) return true;
  
  const patterns = [
    /^https:\/\/www\.google\.com\/maps\/embed\?/,
    /^https:\/\/maps\.app\.goo\.gl\//,
    /^https:\/\/goo\.gl\/maps\//,
    /^https:\/\/www\.google\.com\/maps\/place\//,
    /^https:\/\/maps\.google\.com\/\?/,
    /^https:\/\/www\.google\.com\/maps\/@/
  ];
  
  return patterns.some(pattern => pattern.test(url));
};

// ============================================
// Arabic Name Validation
// ============================================
const validateArabicName = (name) => {
  return /^[\u0600-\u06FF\s]+$/.test(name);
};

// ============================================
// Format Phone Number
// ============================================
const formatPhoneNumber = (phone) => {
  const numbers = phone.replace(/\D/g, '');
  
  if (numbers.startsWith('966')) {
    return `+${numbers}`;
  }
  if (numbers.startsWith('05')) {
    return `+966${numbers.substring(1)}`;
  }
  if (numbers.length === 9 && numbers.startsWith('5')) {
    return `+966${numbers}`;
  }
  
  return phone;
};

// ============================================
// Format License Number
// ============================================
const formatLicenseNumber = (license) => {
  const clean = license.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (clean.length >= 3) {
    const part1 = clean.substring(0, 3);
    const part2 = clean.substring(3, 7);
    const part3 = clean.substring(7, 11);
    
    let formatted = part1;
    if (part2) formatted += `-${part2}`;
    if (part3) formatted += `-${part3}`;
    
    return formatted;
  }
  
  return license.toUpperCase();
};

// ============================================
// Get Password Strength
// ============================================
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'ضعيفة جداً', color: '#ef4444' };
  
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  const strengthMap = [
    { score: 0, label: 'ضعيفة جداً', color: '#ef4444' },
    { score: 1, label: 'ضعيفة', color: '#f97316' },
    { score: 2, label: 'متوسطة', color: '#eab308' },
    { score: 3, label: 'جيدة', color: '#84cc16' },
    { score: 4, label: 'قوية', color: '#22c55e' },
    { score: 5, label: 'قوية جداً', color: '#16a34a' },
    { score: 6, label: 'ممتازة', color: '#15803d' }
  ];
  
  return strengthMap[score] || strengthMap[0];
};

module.exports = {
  validateSaudiID,
  validateLicenseNumber,
  validateSaudiPhone,
  validateEmail,
  validatePassword,
  validateGoogleMapsUrl,
  validateArabicName,
  formatPhoneNumber,
  formatLicenseNumber,
  getPasswordStrength
};