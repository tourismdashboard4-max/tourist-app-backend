// src/components/ui/index.js
/**
 * ================================================
 *           UI COMPONENTS EXPORT FILE
 * ================================================
 * هذا الملف يصدر مكونات UI فقط (واجهة المستخدم)
 * استخدمه عندما تحتاج فقط مكونات تصميمية
 * 
 * طريقة الاستخدام:
 * import { Button, Input, Modal } from './components/ui';
 * ================================================
 */

// ==================== مكونات UI الأساسية ====================

// زر تفاعلي بأنواع وأحجام مختلفة
export { default as Button } from './ Button';



// حقل إدخال مع دعم للأيقونات والأخطاء
export { default as Input } from './Input';

// بطاقة لعرض المحتوى بشكل منظم
export { default as Card } from './ Card';

// نافذة منبثقة قابلة للتخصيص
export { default as Modal } from './Modal';

// مؤشر تحميل بأحجام وألوان متنوعة
export { default as Spinner } from './Spinner';

// ==================== ثوابت وأدوات مساعدة ====================

// أنواع الأزرار المتاحة
export const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  OUTLINE: 'outline',
  SUCCESS: 'success',
  DANGER: 'danger',
  WARNING: 'warning',
  INFO: 'info'
};

// أحجام الأزرار
export const BUTTON_SIZES = {
  XS: 'xs',
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl'
};

// أحجام النوافذ المنبثقة
export const MODAL_SIZES = {
  SM: 'sm',     // 400px
  MD: 'md',     // 500px
  LG: 'lg',     // 600px
  XL: 'xl',     // 800px
  FULL: 'full'  // 95%
};

// ألوان مؤشر التحميل
export const SPINNER_COLORS = {
  PRIMARY: 'primary',     // أزرق
  SECONDARY: 'secondary', // رمادي
  SUCCESS: 'success',     // أخضر
  DANGER: 'danger',       // أحمر
  WARNING: 'warning',     // أصفر
  WHITE: 'white'          // أبيض
};

// ==================== دوال مساعدة ====================

// توليد كلاسات CSS للزر
export const getButtonClass = (variant = 'primary', size = 'md', fullWidth = false) => {
  const classes = [`btn-${variant}`, `btn-${size}`];
  if (fullWidth) classes.push('btn-full-width');
  return classes.join(' ');
};

// التحقق من صحة البريد الإلكتروني
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// تقييد النص لطول محدد
export const truncateText = (text, maxLength = 50) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// ==================== مكونات مركبة ====================

// زر مع أيقونة (مثال على مكون مركب)
export const IconButton = ({ icon, children, ...props }) => {
  return (
    <Button {...props}>
      <span className="icon">{icon}</span>
      {children}
    </Button>
  );
};

// حقل إدخال مع تسمية (Label)
export const LabeledInput = ({ label, required, ...props }) => {
  return (
    <div className="labeled-input">
      {label && (
        <label>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <Input {...props} />
    </div>
  );
};