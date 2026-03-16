// server/src/services/walletService.js
import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class WalletService {
  
  /**
   * إنشاء معرف معاملة فريد
   * @returns {string} معرف المعاملة
   */
  generateTransactionId() {
    return `TXN-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  /**
   * إنشاء معرف طلب سحب
   * @returns {string} معرف الطلب
   */
  generateRequestId() {
    return `REQ-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
  }

  /**
   * التحقق من صحة المبلغ
   * @param {number} amount - المبلغ
   * @returns {Object} نتيجة التحقق
   */
  validateAmount(amount) {
    if (!amount || isNaN(amount)) {
      return { valid: false, error: 'المبلغ غير صحيح' };
    }
    if (amount <= 0) {
      return { valid: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };
    }
    if (amount > 1000000) {
      return { valid: false, error: 'المبلغ يتجاوز الحد المسموح' };
    }
    return { valid: true, amount: parseFloat(amount.toFixed(2)) };
  }

  /**
   * الحصول على رصيد المحفظة
   * @param {string} userId - معرف المستخدم
   * @returns {Promise<Object>} معلومات الرصيد
   */
  async getBalance(userId) {
    try {
      const walletResult = await pool.query(
        'SELECT * FROM app.wallets WHERE user_id = $1',
        [userId]
      );
      
      if (walletResult.rows.length === 0) {
        throw new Error('المحفظة غير موجودة');
      }

      const wallet = walletResult.rows[0];

      return {
        success: true,
        data: {
          balance: parseFloat(wallet.balance),
          frozen: parseFloat(wallet.frozen_balance),
          pending: parseFloat(wallet.pending_balance),
          total: parseFloat(wallet.balance) + parseFloat(wallet.frozen_balance),
          currency: wallet.currency,
          dailyLimit: parseFloat(wallet.daily_limit),
          monthlyLimit: parseFloat(wallet.monthly_limit),
          dailyRemaining: parseFloat(wallet.daily_limit) - parseFloat(wallet.daily_withdrawn || 0),
          monthlyRemaining: parseFloat(wallet.monthly_limit) - parseFloat(wallet.monthly_withdrawn || 0),
          stats: wallet.stats
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * إيداع في المحفظة
   * @param {string} userId - معرف المستخدم
   * @param {number} amount - المبلغ
   * @param {string} paymentMethod - طريقة الدفع
   * @returns {Promise<Object>} نتيجة الإيداع
   */
  async deposit(userId, amount, paymentMethod) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // التحقق من صحة المبلغ
      const validation = this.validateAmount(amount);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const walletResult = await client.query(
        'SELECT * FROM app.wallets WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
      
      if (walletResult.rows.length === 0) {
        throw new Error('المحفظة غير موجودة');
      }

      const wallet = walletResult.rows[0];

      if (wallet.status !== 'active') {
        throw new Error('المحفظة غير نشطة');
      }

      const newBalance = parseFloat(wallet.balance) + validation.amount;

      // إنشاء معاملة جديدة
      const transactionId = this.generateTransactionId();
      await client.query(
        `INSERT INTO app.transactions (
          transaction_id, wallet_id, user_id, type, amount, net_amount,
          status, payment_method, description, balance_after, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          transactionId,
          wallet.id,
          userId,
          'DEPOSIT',
          validation.amount,
          validation.amount,
          'COMPLETED',
          paymentMethod,
          'إيداع في المحفظة',
          newBalance,
          JSON.stringify({})
        ]
      );

      // تحديث المحفظة
      const stats = wallet.stats || {};
      stats.totalDeposits = (stats.totalDeposits || 0) + validation.amount;
      stats.lastActivity = new Date();

      await client.query(
        `UPDATE app.wallets 
         SET balance = $1,
             stats = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newBalance, JSON.stringify(stats), wallet.id]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'تم الإيداع بنجاح',
        data: {
          transactionId,
          newBalance
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * طلب سحب
   * @param {string} userId - معرف المستخدم
   * @param {number} amount - المبلغ
   * @param {string} bankAccountId - معرف الحساب البنكي
   * @returns {Promise<Object>} نتيجة الطلب
   */
  async requestWithdraw(userId, amount, bankAccountId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const walletResult = await client.query(
        'SELECT * FROM app.wallets WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
      
      if (walletResult.rows.length === 0) {
        throw new Error('المحفظة غير موجودة');
      }

      const wallet = walletResult.rows[0];

      if (wallet.user_type !== 'guide') {
        throw new Error('فقط المرشدين يمكنهم سحب الأموال');
      }

      if (wallet.status !== 'active') {
        throw new Error('المحفظة غير نشطة');
      }

      // التحقق من الحساب البنكي
      const bankAccountResult = await client.query(
        'SELECT * FROM app.bank_accounts WHERE id = $1 AND user_id = $2 AND is_verified = true',
        [bankAccountId, userId]
      );

      if (bankAccountResult.rows.length === 0) {
        throw new Error('الحساب البنكي غير موجود أو غير موثق');
      }

      const bankAccount = bankAccountResult.rows[0];
      const currentBalance = parseFloat(wallet.balance);

      // التحقق من الرصيد
      if (currentBalance < amount) {
        throw new Error('الرصيد غير كافٍ');
      }

      // التحقق من الحد الأدنى
      if (amount < 100) {
        throw new Error('الحد الأدنى للسحب 100 ريال');
      }

      // التحقق من الحدود اليومية
      const dailyCheck = await this.checkDailyLimit(client, wallet, amount);
      if (!dailyCheck.allowed) {
        throw new Error(dailyCheck.message);
      }

      // التحقق من الحدود الشهرية
      const monthlyCheck = await this.checkMonthlyLimit(client, wallet, amount);
      if (!monthlyCheck.allowed) {
        throw new Error(monthlyCheck.message);
      }

      // حساب الرسوم (1% للمبالغ فوق 5000)
      let fee = 0;
      if (amount > 5000) {
        fee = amount * 0.01;
      }

      const requestId = this.generateRequestId();

      // إنشاء طلب سحب
      await client.query(
        `INSERT INTO app.withdraw_requests (
          request_id, user_id, wallet_id, bank_account_id, amount, fee,
          net_amount, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          requestId,
          userId,
          wallet.id,
          bankAccountId,
          amount,
          fee,
          amount - fee,
          'PENDING'
        ]
      );

      // إنشاء معاملة
      const transactionId = this.generateTransactionId();
      await client.query(
        `INSERT INTO app.transactions (
          transaction_id, wallet_id, user_id, type, amount, fee, net_amount,
          status, description, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          transactionId,
          wallet.id,
          userId,
          'WITHDRAW',
          amount,
          fee,
          amount - fee,
          'PENDING',
          'طلب سحب قيد المراجعة',
          JSON.stringify({ requestId })
        ]
      );

      // تجميد المبلغ
      await client.query(
        `UPDATE app.wallets 
         SET balance = balance - $1,
             frozen_balance = frozen_balance + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [amount, wallet.id]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'تم تقديم طلب السحب بنجاح',
        data: {
          requestId,
          transactionId,
          amount,
          fee,
          netAmount: amount - fee,
          estimatedProcessing: '24-72 ساعة'
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * التحقق من الحد اليومي
   * @param {Object} client - عميل PostgreSQL
   * @param {Object} wallet - المحفظة
   * @param {number} amount - المبلغ
   * @returns {Promise<Object>} نتيجة التحقق
   */
  async checkDailyLimit(client, wallet, amount) {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM app.withdraw_requests
       WHERE wallet_id = $1 
         AND status IN ('APPROVED', 'PENDING')
         AND DATE(created_at) = $2`,
      [wallet.id, today]
    );

    const dailyWithdrawn = parseFloat(result.rows[0].total);
    const dailyLimit = parseFloat(wallet.daily_limit);

    if (dailyWithdrawn + amount > dailyLimit) {
      return {
        allowed: false,
        remaining: dailyLimit - dailyWithdrawn,
        message: `تجاوزت الحد اليومي، المتبقي ${dailyLimit - dailyWithdrawn} ريال`
      };
    }

    return {
      allowed: true,
      remaining: dailyLimit - (dailyWithdrawn + amount)
    };
  }

  /**
   * التحقق من الحد الشهري
   * @param {Object} client - عميل PostgreSQL
   * @param {Object} wallet - المحفظة
   * @param {number} amount - المبلغ
   * @returns {Promise<Object>} نتيجة التحقق
   */
  async checkMonthlyLimit(client, wallet, amount) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const result = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM app.withdraw_requests
       WHERE wallet_id = $1 
         AND status IN ('APPROVED', 'PENDING')
         AND DATE(created_at) BETWEEN $2 AND $3`,
      [wallet.id, firstDay, lastDay]
    );

    const monthlyWithdrawn = parseFloat(result.rows[0].total);
    const monthlyLimit = parseFloat(wallet.monthly_limit);

    if (monthlyWithdrawn + amount > monthlyLimit) {
      return {
        allowed: false,
        remaining: monthlyLimit - monthlyWithdrawn,
        message: `تجاوزت الحد الشهري، المتبقي ${monthlyLimit - monthlyWithdrawn} ريال`
      };
    }

    return {
      allowed: true,
      remaining: monthlyLimit - (monthlyWithdrawn + amount)
    };
  }

  /**
   * معالجة طلب سحب (للمشرف)
   * @param {string} requestId - معرف الطلب
   * @param {boolean} approved - موافقة أو رفض
   * @param {string} notes - ملاحظات
   * @returns {Promise<Object>} نتيجة المعالجة
   */
  async processWithdrawRequest(requestId, approved, notes = '') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const requestResult = await client.query(
        'SELECT * FROM app.withdraw_requests WHERE request_id = $1 FOR UPDATE',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new Error('طلب السحب غير موجود');
      }

      const request = requestResult.rows[0];

      if (request.status !== 'PENDING') {
        throw new Error('تم معالجة الطلب مسبقاً');
      }

      if (approved) {
        // الموافقة على السحب
        await client.query(
          `UPDATE app.withdraw_requests 
           SET status = $1, processed_at = NOW(), notes = $2
           WHERE request_id = $3`,
          ['APPROVED', notes, requestId]
        );

        // تحديث المحفظة
        await client.query(
          `UPDATE app.wallets 
           SET frozen_balance = frozen_balance - $1,
               daily_withdrawn = COALESCE(daily_withdrawn, 0) + $1,
               monthly_withdrawn = COALESCE(monthly_withdrawn, 0) + $1,
               last_withdraw_date = NOW(),
               stats = jsonb_set(
                 COALESCE(stats, '{}'::jsonb),
                 '{totalWithdrawals}',
                 COALESCE(stats->'totalWithdrawals', '0')::numeric + $1
               ),
               updated_at = NOW()
           WHERE id = $2`,
          [request.amount, request.wallet_id]
        );

        // تحديث المعاملة
        await client.query(
          `UPDATE app.transactions 
           SET status = 'COMPLETED', processed_at = NOW()
           WHERE metadata->>'requestId' = $1`,
          [requestId]
        );

      } else {
        // رفض السحب
        await client.query(
          `UPDATE app.withdraw_requests 
           SET status = $1, processed_at = NOW(), rejection_reason = $2, notes = $3
           WHERE request_id = $4`,
          ['REJECTED', notes, notes, requestId]
        );

        // إعادة المبلغ للمحفظة
        await client.query(
          `UPDATE app.wallets 
           SET balance = balance + $1,
               frozen_balance = frozen_balance - $1,
               updated_at = NOW()
           WHERE id = $2`,
          [request.amount, request.wallet_id]
        );

        // تحديث المعاملة
        await client.query(
          `UPDATE app.transactions 
           SET status = 'FAILED', 
               processed_at = NOW(),
               description = CONCAT(description, ' - تم رفض طلب السحب: ', $1)
           WHERE metadata->>'requestId' = $2`,
          [notes, requestId]
        );
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: approved ? 'تمت الموافقة على طلب السحب' : 'تم رفض طلب السحب',
        data: request
      };
    } catch (error) {
      await client.query('ROLLBACK');
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * الحصول على سجل المعاملات
   * @param {string} userId - معرف المستخدم
   * @param {Object} filter - فلتر
   * @returns {Promise<Object>} سجل المعاملات
   */
  async getTransactions(userId, filter = {}) {
    try {
      const walletResult = await pool.query(
        'SELECT id FROM app.wallets WHERE user_id = $1',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error('المحفظة غير موجودة');
      }

      const walletId = walletResult.rows[0].id;

      let query = 'SELECT * FROM app.transactions WHERE wallet_id = $1';
      const queryParams = [walletId];
      let paramIndex = 2;

      if (filter.type) {
        query += ` AND type = $${paramIndex}`;
        queryParams.push(filter.type);
        paramIndex++;
      }

      if (filter.status) {
        query += ` AND status = $${paramIndex}`;
        queryParams.push(filter.status);
        paramIndex++;
      }

      if (filter.startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        queryParams.push(filter.startDate);
        paramIndex++;
      }

      if (filter.endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        queryParams.push(filter.endDate);
        paramIndex++;
      }

      const page = filter.page || 1;
      const limit = filter.limit || 50;
      const offset = (page - 1) * limit;

      // حساب العدد الإجمالي
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // جلب المعاملات مع الترتيب
      query += ' ORDER BY created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
      queryParams.push(limit, offset);

      const transactionsResult = await pool.query(query, queryParams);

      return {
        success: true,
        data: {
          transactions: transactionsResult.rows,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * تجميد مبلغ للحجز
   * @param {Object} client - عميل PostgreSQL
   * @param {string} userId - معرف المستخدم
   * @param {number} amount - المبلغ
   * @param {string} bookingId - معرف الحجز
   * @returns {Promise<Object>} نتيجة التجميد
   */
  async holdAmount(client, userId, amount, bookingId) {
    try {
      const walletResult = await client.query(
        'SELECT * FROM app.wallets WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error('المحفظة غير موجودة');
      }

      const wallet = walletResult.rows[0];

      if (parseFloat(wallet.balance) < amount) {
        throw new Error('الرصيد غير كافٍ للحجز');
      }

      const transactionId = this.generateTransactionId();
      const newBalance = parseFloat(wallet.balance) - amount;

      await client.query(
        `INSERT INTO app.transactions (
          transaction_id, wallet_id, user_id, type, amount, net_amount,
          status, description, reference_id, balance_after, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          transactionId,
          wallet.id,
          userId,
          'HOLD',
          amount,
          amount,
          'COMPLETED',
          `تجميد مبلغ للحجز ${bookingId}`,
          bookingId,
          newBalance
        ]
      );

      await client.query(
        `UPDATE app.wallets 
         SET balance = balance - $1,
             frozen_balance = frozen_balance + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [amount, wallet.id]
      );

      return { 
        success: true, 
        transactionId 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * إطلاق المبلغ المجمد
   * @param {Object} client - عميل PostgreSQL
   * @param {string} userId - معرف المستخدم
   * @param {number} amount - المبلغ
   * @param {string} bookingId - معرف الحجز
   * @returns {Promise<Object>} نتيجة الإطلاق
   */
  async releaseAmount(client, userId, amount, bookingId) {
    try {
      const walletResult = await client.query(
        'SELECT * FROM app.wallets WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error('المحفظة غير موجودة');
      }

      const wallet = walletResult.rows[0];

      if (parseFloat(wallet.frozen_balance) < amount) {
        throw new Error('المبلغ المجمد غير كافٍ');
      }

      const transactionId = this.generateTransactionId();
      const newBalance = parseFloat(wallet.balance) + amount;

      await client.query(
        `INSERT INTO app.transactions (
          transaction_id, wallet_id, user_id, type, amount, net_amount,
          status, description, reference_id, balance_after, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          transactionId,
          wallet.id,
          userId,
          'RELEASE',
          amount,
          amount,
          'COMPLETED',
          `إطلاق مبلغ مجمد للحجز ${bookingId}`,
          bookingId,
          newBalance
        ]
      );

      await client.query(
        `UPDATE app.wallets 
         SET balance = balance + $1,
             frozen_balance = frozen_balance - $1,
             updated_at = NOW()
         WHERE id = $2`,
        [amount, wallet.id]
      );

      return { 
        success: true, 
        transactionId 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

const walletService = new WalletService();
export default walletService;
