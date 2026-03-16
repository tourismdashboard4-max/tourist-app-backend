// server/src/services/authWalletService.js
import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class AuthWalletService {
  
  /**
   * توليد رقم محفظة فريد
   * @param {string} userId - معرف المستخدم
   * @param {string} userType - نوع المستخدم
   * @returns {string} رقم المحفظة
   */
  generateWalletNumber(userId, userType) {
    const prefix = userType === 'guide' ? 'G' : 'T';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const userIdHash = userId.toString().slice(-4).padStart(4, '0');
    
    return `${prefix}-${timestamp}-${random}-${userIdHash}`;
  }

  /**
   * إنشاء محفظة لمستخدم جديد
   * @param {string} userId - معرف المستخدم
   * @param {string} userType - نوع المستخدم
   * @param {Object} userData - بيانات المستخدم
   * @returns {Promise<Object>} المحفظة المنشأة
   */
  async createWalletForNewUser(userId, userType, userData = {}) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // التحقق من عدم وجود محفظة مسبقة
      const existingWallet = await client.query(
        'SELECT * FROM app.wallets WHERE user_id = $1',
        [userId]
      );
      
      if (existingWallet.rows.length > 0) {
        await client.query('COMMIT');
        return existingWallet.rows[0];
      }

      // توليد رقم المحفظة
      const walletNumber = this.generateWalletNumber(userId, userType);

      // تحديد الحدود حسب نوع المستخدم
      const limits = this.getUserLimits(userType);

      // إنشاء المحفظة
      const walletResult = await client.query(
        `INSERT INTO app.wallets (
          wallet_number, user_id, user_type, balance, frozen_balance,
          pending_balance, currency, status, daily_limit, monthly_limit,
          stats, program, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *`,
        [
          walletNumber,
          userId,
          userType === 'guide' ? 'guide' : 'tourist',
          0, // balance
          0, // frozen_balance
          0, // pending_balance
          'SAR',
          'active',
          limits.dailyLimit,
          limits.monthlyLimit,
          JSON.stringify({
            totalDeposits: 0,
            totalWithdrawals: 0,
            totalBookings: 0,
            totalFees: 0,
            lastActivity: new Date()
          }),
          userType === 'guide' ? JSON.stringify({
            type: 'basic',
            startDate: new Date(),
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            autoRenew: true
          }) : null,
          JSON.stringify({
            createdFrom: 'registration',
            userEmail: userData.email,
            userName: userData.name,
            createdAt: new Date()
          })
        ]
      );

      const wallet = walletResult.rows[0];

      // تسجيل معاملة إنشاء المحفظة
      await this.logWalletCreation(client, wallet, userData);

      await client.query('COMMIT');

      console.log(`✅ تم إنشاء محفظة جديدة: ${walletNumber} للمستخدم ${userId}`);
      
      return wallet;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ خطأ في إنشاء المحفظة:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * تحديد الحدود حسب نوع المستخدم
   * @param {string} userType - نوع المستخدم
   * @returns {Object} الحدود
   */
  getUserLimits(userType) {
    if (userType === 'guide') {
      return {
        dailyLimit: 5000,    // 5000 ريال يومياً
        monthlyLimit: 25000,  // 25000 ريال شهرياً
        minWithdraw: 100,
        maxBalance: 100000
      };
    } else {
      return {
        dailyLimit: 10000,   // 10000 ريال يومياً
        monthlyLimit: 50000,  // 50000 ريال شهرياً
        minWithdraw: 50,
        maxBalance: 50000
      };
    }
  }

  /**
   * تسجيل معاملة إنشاء المحفظة
   * @param {Object} client - عميل PostgreSQL للـ transaction
   * @param {Object} wallet - المحفظة
   * @param {Object} userData - بيانات المستخدم
   */
  async logWalletCreation(client, wallet, userData) {
    const transactionId = `TXN-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    await client.query(
      `INSERT INTO app.transactions (
        transaction_id, wallet_id, user_id, type, amount, net_amount,
        status, description, balance_after, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        transactionId,
        wallet.id,
        wallet.user_id,
        'SYSTEM',
        0,
        0,
        'COMPLETED',
        'تم إنشاء المحفظة بنجاح',
        0,
        JSON.stringify({
          walletNumber: wallet.wallet_number,
          userType: wallet.user_type,
          userName: userData.name,
          event: 'WALLET_CREATION'
        })
      ]
    );
  }

  /**
   * إنشاء محافظ للمستخدمين الحاليين (للهجرة)
   * @returns {Promise<Object>} نتائج الإنشاء
   */
  async createWalletsForExistingUsers() {
    // جلب جميع المستخدمين من PostgreSQL
    const usersResult = await pool.query(
      'SELECT id, email, full_name as name, type FROM app.users'
    );
    
    const users = usersResult.rows;
    
    const results = {
      total: users.length,
      created: 0,
      skipped: 0,
      failed: 0
    };

    for (const user of users) {
      try {
        // التحقق من وجود محفظة
        const existingWallet = await pool.query(
          'SELECT * FROM app.wallets WHERE user_id = $1',
          [user.id]
        );
        
        if (existingWallet.rows.length === 0) {
          await this.createWalletForNewUser(
            user.id, 
            user.type,
            { email: user.email, name: user.name }
          );
          results.created++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        console.error(`فشل إنشاء محفظة للمستخدم ${user.id}:`, error);
        results.failed++;
      }
    }

    return results;
  }

  /**
   * الحصول على بيانات المحفظة مع المستخدم
   * @param {string} userId - معرف المستخدم
   * @returns {Promise<Object>} المحفظة مع بيانات المستخدم
   */
  async getWalletWithUser(userId) {
    const result = await pool.query(
      `SELECT 
        w.*,
        json_build_object(
          'id', u.id,
          'fullName', u.full_name,
          'email', u.email,
          'phone', u.phone,
          'avatar', u.avatar
        ) as user
      FROM app.wallets w
      JOIN app.users u ON u.id = w.user_id
      WHERE w.user_id = $1`,
      [userId]
    );
    
    return result.rows[0] || null;
  }

  /**
   * الحصول على رصيد المحفظة
   * @param {string} userId - معرف المستخدم
   * @returns {Promise<Object>} معلومات الرصيد
   */
  async getWalletBalance(userId) {
    const result = await pool.query(
      `SELECT 
        balance, frozen_balance, pending_balance, currency,
        daily_limit, monthly_limit
      FROM app.wallets 
      WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const wallet = result.rows[0];
    return {
      available: parseFloat(wallet.balance) - parseFloat(wallet.frozen_balance),
      balance: parseFloat(wallet.balance),
      frozen: parseFloat(wallet.frozen_balance),
      pending: parseFloat(wallet.pending_balance),
      currency: wallet.currency,
      limits: {
        daily: parseFloat(wallet.daily_limit),
        monthly: parseFloat(wallet.monthly_limit)
      }
    };
  }
}

// تصدير الكلاس
export default new AuthWalletService();
