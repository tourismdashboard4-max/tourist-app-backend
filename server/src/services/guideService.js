// server/src/services/guideService.js
import User from '../models/User.js';
import Notification from '../models/Notification.js';

class GuideService {
  
  /**
   * تسجيل مرشد جديد (طلب ترقية)
   */
  async registerGuide(userId, guideData) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      if (user.type === 'guide') {
        throw new Error('أنت بالفعل مرشد سياحي');
      }

      // التحقق من عدم استخدام رقم الهوية
      if (guideData.civilId) {
        const existingCivilId = await User.findOne({ 'guideData.civilId': guideData.civilId });
        if (existingCivilId) {
          throw new Error('رقم الهوية مستخدم بالفعل');
        }
      }

      // التحقق من عدم استخدام رقم الرخصة
      const existingLicense = await User.findOne({ 'guideData.licenseNumber': guideData.licenseNumber });
      if (existingLicense) {
        throw new Error('رقم الرخصة مستخدم بالفعل');
      }

      // تقديم طلب الترقية
      user.guideData = {
        civilId: guideData.civilId,
        licenseNumber: guideData.licenseNumber,
        specialties: guideData.specialties ? guideData.specialties.split(',').map(s => s.trim()) : [],
        experience: guideData.experience || 0,
        bio: guideData.bio || '',
        upgradeRequest: {
          status: 'pending',
          submittedAt: new Date()
        }
      };

      await user.save();

      // إرسال إشعار للمشرفين
      await this.notifyAdminsOfNewRequest(user);

      return {
        success: true,
        message: 'تم إرسال طلب التسجيل بنجاح',
        data: {
          requestId: user._id,
          status: 'pending'
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * إشعار المشرفين بطلب جديد
   */
  async notifyAdminsOfNewRequest(user) {
    try {
      const admins = await User.find({ type: 'admin' });
      
      if (admins.length === 0) return;

      const notifications = admins.map(admin => ({
        recipientId: admin._id,
        type: 'upgrade_request',
        title: {
          ar: '📝 طلب ترقية جديد',
          en: '📝 New Upgrade Request'
        },
        message: {
          ar: `طلب ترقية جديد من ${user.fullName} ليصبح مرشداً سياحياً`,
          en: `New upgrade request from ${user.fullName} to become a tourist guide`
        },
        data: {
          userId: user._id,
          userName: user.fullName,
          userEmail: user.email
        },
        read: false
      }));

      await Notification.insertMany(notifications);
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  }
}

export default new GuideService();