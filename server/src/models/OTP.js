// ============================================
// OTP Model - رموز التحقق للمصادقة (PostgreSQL)
// ============================================
import { pool } from '../../server.js';
import { createExpiryDate, isOTPValid, getTimeRemaining } from '../utils/timeUtils.js';

const OTP = {
  // ============================================
  // إنشاء رمز OTP جديد
  // ============================================
  async create(otpData) {
    const {
      email,
      phone,
      identifier,
      code,
      purpose = 'register',
      identifierType = email ? 'email' : 'phone',
      expiresAt = createExpiryDate(10), // استخدام الدالة المساعدة
      metadata = {}
    } = otpData;

    // تنظيف البيانات
    const cleanEmail = email ? email.toLowerCase().trim() : null;
    const cleanPhone = phone ? phone.replace(/\s+/g, '') : null;
    const finalIdentifier = identifier || cleanEmail || cleanPhone;
    const codeStr = code.toString();

    console.log('📝 Creating OTP with data:', {
      cleanEmail,
      cleanPhone,
      finalIdentifier,
      codeStr,
      purpose,
      identifierType,
      expiresAt: expiresAt.toISOString(),
      currentTime: new Date().toISOString()
    });

    const query = `
      INSERT INTO app.otps (
        email, phone, identifier, code, purpose, 
        identifier_type, expires_at, metadata, attempts, 
        verified, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING 
        id, 
        email, 
        phone, 
        identifier, 
        code, 
        purpose, 
        identifier_type as "identifierType",
        expires_at as "expiresAt",
        metadata,
        attempts,
        verified,
        created_at as "createdAt"
    `;

    const values = [
      cleanEmail,
      cleanPhone,
      finalIdentifier,
      codeStr,
      purpose,
      identifierType,
      expiresAt,
      JSON.stringify(metadata),
      0, // attempts
      false // verified
    ];

    try {
      const result = await pool.query(query, values);
      console.log('✅ OTP saved successfully:', {
        id: result.rows[0].id,
        code: result.rows[0].code,
        expiresAt: result.rows[0].expiresAt,
        createdAt: result.rows[0].createdAt
      });
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating OTP:', error);
      throw error;
    }
  },

  // ============================================
  // البحث عن رمز OTP واحد
  // ============================================
  async findOne(criteria) {
    let query = 'SELECT * FROM app.otps WHERE 1=1';
    const values = [];
    let index = 1;

    console.log('🔍 findOne with criteria:', criteria);

    // معالجة معايير البحث
    if (criteria.identifier) {
      query += ` AND identifier = $${index}`;
      values.push(criteria.identifier);
      index++;
    }

    if (criteria.email) {
      query += ` AND email = $${index}`;
      values.push(criteria.email.toLowerCase().trim());
      index++;
    }

    if (criteria.phone) {
      query += ` AND phone = $${index}`;
      values.push(criteria.phone.replace(/\s+/g, ''));
      index++;
    }

    if (criteria.code !== undefined) {
      const codeStr = criteria.code.toString();
      query += ` AND code = $${index}`;
      values.push(codeStr);
      index++;
    }

    if (criteria.purpose) {
      query += ` AND purpose = $${index}`;
      values.push(criteria.purpose);
      index++;
    }

    if (criteria.verified !== undefined) {
      query += ` AND verified = $${index}`;
      values.push(criteria.verified);
      index++;
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    try {
      const result = await pool.query(query, values);
      console.log('🔍 findOne result count:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('✅ Found OTP:', {
          id: result.rows[0].id,
          code: result.rows[0].code,
          expires_at: result.rows[0].expires_at
        });
      } else {
        console.log('❌ No OTP found');
      }
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error finding OTP:', error);
      throw error;
    }
  },

  // ============================================
  // البحث عن عدة رموز OTP
  // ============================================
  async find(criteria) {
    let query = 'SELECT * FROM app.otps WHERE 1=1';
    const values = [];
    let index = 1;

    if (criteria.identifier) {
      query += ` AND identifier = $${index}`;
      values.push(criteria.identifier);
      index++;
    }

    if (criteria.purpose) {
      query += ` AND purpose = $${index}`;
      values.push(criteria.purpose);
      index++;
    }

    query += ' ORDER BY created_at DESC';

    try {
      const result = await pool.query(query, values);
      console.log(`🔍 find found ${result.rows.length} OTPs`);
      return result.rows;
    } catch (error) {
      console.error('❌ Error finding OTPs:', error);
      throw error;
    }
  },

  // ============================================
  // تحديث عدة سجلات
  // ============================================
  async updateMany(criteria, updateData) {
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    // بناء WHERE
    if (criteria.identifier) {
      whereClause += ` AND identifier = $${index}`;
      values.push(criteria.identifier);
      index++;
    }

    if (criteria.purpose) {
      whereClause += ` AND purpose = $${index}`;
      values.push(criteria.purpose);
      index++;
    }

    if (criteria.verified !== undefined) {
      whereClause += ` AND verified = $${index}`;
      values.push(criteria.verified);
      index++;
    }

    // بناء SET
    const setClauses = [];
    if (updateData.expiresAt) {
      setClauses.push(`expires_at = $${index}`);
      values.push(updateData.expiresAt);
      index++;
    }

    if (updateData.verified !== undefined) {
      setClauses.push(`verified = $${index}`);
      values.push(updateData.verified);
      index++;
    }

    if (setClauses.length === 0) {
      return;
    }

    const query = `UPDATE app.otps SET ${setClauses.join(', ')} ${whereClause}`;

    try {
      await pool.query(query, values);
      console.log('✅ updateMany completed');
    } catch (error) {
      console.error('❌ Error updating OTPs:', error);
      throw error;
    }
  },

  // ============================================
  // البحث عن رمز صالح - نسخة محسنة
  // ============================================
  async findValidOTP(identifier, code, purpose) {
    console.log('🔍 Searching for valid OTP with:', { 
      identifier, 
      code: code.toString(), 
      purpose,
      currentTime: new Date().toISOString()
    });
    
    // البحث بالشرط الصارم باستخدام NOW() AT TIME ZONE 'UTC'
    const strictQuery = `
      SELECT * FROM app.otps 
      WHERE identifier = $1 
        AND code = $2 
        AND purpose = $3 
        AND verified = false 
        AND expires_at > NOW() AT TIME ZONE 'UTC'
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const values = [identifier, code.toString(), purpose];

    try {
      let result = await pool.query(strictQuery, values);
      
      if (result.rows.length > 0) {
        console.log('✅ Found valid OTP (strict):', {
          id: result.rows[0].id,
          code: result.rows[0].code,
          expires_at: result.rows[0].expires_at,
          time_remaining: getTimeRemaining(result.rows[0])
        });
        return result.rows[0];
      }
      
      // إذا لم نجد، نبحث بدون شرط انتهاء الصلاحية للتشخيص
      console.log('⚠️ No OTP found with strict expiry, checking all records...');
      
      const lenientQuery = `
        SELECT * FROM app.otps 
        WHERE identifier = $1 
          AND code = $2 
          AND purpose = $3 
          AND verified = false 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      result = await pool.query(lenientQuery, values);
      
      if (result.rows.length > 0) {
        const remaining = getTimeRemaining(result.rows[0]);
        console.log('⚠️ Found OTP but it might be expired:', {
          id: result.rows[0].id,
          code: result.rows[0].code,
          expires_at: result.rows[0].expires_at,
          time_remaining: remaining + ' seconds',
          expired: remaining <= 0
        });
        
        return result.rows[0];
      }
      
      console.log('❌ No OTP found at all');
      
      // للتحقق، نبحث عن أي سجلات بهذا المعرف
      const allOTPsQuery = `
        SELECT * FROM app.otps 
        WHERE identifier = $1 
        ORDER BY created_at DESC
      `;
      const allResults = await pool.query(allOTPsQuery, [identifier]);
      console.log(`📋 All OTPs for ${identifier}:`, allResults.rows.map(r => ({
        id: r.id,
        code: r.code,
        purpose: r.purpose,
        verified: r.verified,
        expires_at: r.expires_at,
        created_at: r.created_at,
        remaining: getTimeRemaining(r)
      })));
      
      return null;
    } catch (error) {
      console.error('❌ Error finding valid OTP:', error);
      throw error;
    }
  },

  // ============================================
  // إنهاء صلاحية الرموز السابقة
  // ============================================
  async expirePreviousOTPs(identifier, purpose) {
    console.log('🔒 Expiring previous OTPs for:', { identifier, purpose });
    
    const query = `
      UPDATE app.otps 
      SET expires_at = NOW() AT TIME ZONE 'UTC'
      WHERE identifier = $1 
        AND purpose = $2 
        AND verified = false 
        AND expires_at > NOW() AT TIME ZONE 'UTC'
    `;
    const values = [identifier, purpose];

    try {
      await pool.query(query, values);
      console.log('✅ Previous OTPs expired successfully');
    } catch (error) {
      console.error('❌ Error expiring previous OTPs:', error);
      throw error;
    }
  },

  // ============================================
  // توليد رمز جديد
  // ============================================
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  // ============================================
  // التحقق من صحة الرمز (للاستخدام في الكود)
  // ============================================
  isValid(otpRecord) {
    return isOTPValid(otpRecord);
  },

  // ============================================
  // الحصول على الوقت المتبقي بالثواني
  // ============================================
  getTimeRemaining(otpRecord) {
    return getTimeRemaining(otpRecord);
  },

  // ============================================
  // زيادة عدد المحاولات
  // ============================================
  async incrementAttempts(id) {
    const query = `
      UPDATE app.otps 
      SET attempts = attempts + 1 
      WHERE id = $1 
      RETURNING attempts
    `;
    const values = [id];

    try {
      const result = await pool.query(query, values);
      return result.rows[0]?.attempts || 0;
    } catch (error) {
      console.error('❌ Error incrementing attempts:', error);
      throw error;
    }
  },

  // ============================================
  // إنهاء صلاحية رمز معين
  // ============================================
  async expire(id) {
    const query = `
      UPDATE app.otps 
      SET expires_at = NOW() AT TIME ZONE 'UTC'
      WHERE id = $1 
      RETURNING *
    `;
    const values = [id];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error expiring OTP:', error);
      throw error;
    }
  },

  // ============================================
  // تحديث رمز OTP
  // ============================================
  async save(otpData) {
    if (!otpData.id) {
      return this.create(otpData);
    }

    const setClauses = [];
    const values = [];
    let index = 1;

    if (otpData.verified !== undefined) {
      setClauses.push(`verified = $${index}`);
      values.push(otpData.verified);
      index++;
    }

    if (otpData.attempts !== undefined) {
      setClauses.push(`attempts = $${index}`);
      values.push(otpData.attempts);
      index++;
    }

    if (setClauses.length === 0) {
      return otpData;
    }

    values.push(otpData.id);
    const query = `UPDATE app.otps SET ${setClauses.join(', ')} WHERE id = $${index} RETURNING *`;

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error saving OTP:', error);
      throw error;
    }
  }
};

export default OTP;