const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { v4: uuidv4 } = require('uuid');

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
    try {
      // التحقق من عدم وجود محفظة مسبقة
      const existingWallet = await Wallet.findOne({ userId });
      if (existingWallet) {
        return existingWallet;
      }

      // توليد رقم المحفظة
      const walletNumber = this.generateWalletNumber(userId, userType);

      // تحديد الحدود حسب نوع المستخدم
      const limits = this.getUserLimits(userType);

      // إنشاء المحفظة
      const wallet = new Wallet({
        walletNumber,
        userId,
        userType: userType === 'guide' ? 'guide' : 'tourist',
        balance: 0,
        frozenBalance: 0,
        pendingBalance: 0,
        currency: 'SAR',
        status: 'active',
        
        // حدود المعاملات
        dailyLimit: limits.dailyLimit,
        monthlyLimit: limits.monthlyLimit,
        
        // إحصائيات أولية
        stats: {
          totalDeposits: 0,
          totalWithdrawals: 0,
          totalBookings: 0,
          totalFees: 0,
          lastActivity: new Date()
        },
        
        // برنامج افتراضي للمرشدين
        program: userType === 'guide' ? {
          type: 'basic',
          startDate: new Date(),
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: true
        } : undefined,

        // بيانات إضافية
        metadata: {
          createdFrom: 'registration',
          userEmail: userData.email,
          userName: userData.name,
          createdAt: new Date()
        }
      });

      await wallet.save();

      // تسجيل معاملة إنشاء المحفظة
      await this.logWalletCreation(wallet, userData);

      console.log(`✅ تم إنشاء محفظة جديدة: ${walletNumber} للمستخدم ${userId}`);
      
      return wallet;
    } catch (error) {
      console.error('❌ خطأ في إنشاء المحفظة:', error);
      throw error;
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
   * @param {Object} wallet - المحفظة
   * @param {Object} userData - بيانات المستخدم
   */
  async logWalletCreation(wallet, userData) {
    const transaction = new Transaction({
      transactionId: `TXN-${Date.now()}-${uuidv4().slice(0, 8)}`,
      walletId: wallet._id,
      userId: wallet.userId,
      type: 'SYSTEM',
      amount: 0,
      netAmount: 0,
      status: 'COMPLETED',
      description: 'تم إنشاء المحفظة بنجاح',
      balanceAfter: 0,
      metadata: {
        walletNumber: wallet.walletNumber,
        userType: wallet.userType,
        userName: userData.name,
        event: 'WALLET_CREATION'
      }
    });

    await transaction.save();
  }

  /**
   * إنشاء محافظ للمستخدمين الحاليين (للهجرة)
   * @returns {Promise<Object>} نتائج الإنشاء
   */
  async createWalletsForExistingUsers() {
    const User = require('../models/User');
    const users = await User.find({});
    
    const results = {
      total: users.length,
      created: 0,
      skipped: 0,
      failed: 0
    };

    for (const user of users) {
      try {
        const existingWallet = await Wallet.findOne({ userId: user._id });
        
        if (!existingWallet) {
          await this.createWalletForNewUser(
            user._id, 
            user.type,
            { email: user.email, name: user.fullName }
          );
          results.created++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        console.error(`فشل إنشاء محفظة للمستخدم ${user._id}:`, error);
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
    const wallet = await Wallet.findOne({ userId })
      .populate('userId', 'fullName email phone avatar');
    
    return wallet;
  }
}

module.exports = new AuthWalletService();