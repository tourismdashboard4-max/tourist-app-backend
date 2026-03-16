// server/src/services/guideService.js
import { pool } from '../config/database.js';

class GuideService {
  
  /**
   * تسجيل مرشد جديد (طلب ترقية)
   */
  async registerGuide(userId, guideData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // البحث عن المستخدم
      const userResult = await client.query(
        'SELECT * FROM app.users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('المستخدم غير موجود');
      }
      
      const user = userResult.rows[0];

      if (user.type === 'guide') {
        throw new Error('أنت بالفعل مرشد سياحي');
      }

      // التحقق من عدم استخدام رقم الهوية
      if (guideData.civilId) {
        const existingCivilIdResult = await client.query(
          "SELECT id FROM app.users WHERE guide_data->>'civilId' = $1",
          [guideData.civilId]
        );
        
        if (existingCivilIdResult.rows.length > 0) {
          throw new Error('رقم الهوية مستخدم بالفعل');
        }
      }

      // التحقق من عدم استخدام رقم الرخصة
      const existingLicenseResult = await client.query(
        "SELECT id FROM app.users WHERE guide_data->>'licenseNumber' = $1",
        [guideData.licenseNumber]
      );
      
      if (existingLicenseResult.rows.length > 0) {
        throw new Error('رقم الرخصة مستخدم بالفعل');
      }

      // تحضير بيانات المرشد
      const guideDataJson = {
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

      // تحديث المستخدم
      const updatedResult = await client.query(
        `UPDATE app.users 
         SET guide_data = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id`,
        [JSON.stringify(guideDataJson), userId]
      );

      if (updatedResult.rows.length === 0) {
        throw new Error('فشل تحديث بيانات المستخدم');
      }

      await client.query('COMMIT');

      // إرسال إشعار للمشرفين (بعد الـ commit)
      await this.notifyAdminsOfNewRequest({
        id: userId,
        full_name: user.full_name,
        email: user.email
      });

      return {
        success: true,
        message: 'تم إرسال طلب التسجيل بنجاح',
        data: {
          requestId: userId,
          status: 'pending'
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error registering guide:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * إشعار المشرفين بطلب جديد
   */
  async notifyAdminsOfNewRequest(user) {
    try {
      // البحث عن المشرفين
      const adminsResult = await pool.query(
        "SELECT id FROM app.users WHERE type = 'admin'"
      );
      
      const admins = adminsResult.rows;
      
      if (admins.length === 0) return;

      // إنشاء الإشعارات
      const notifications = [];
      const now = new Date();

      for (const admin of admins) {
        const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        
        const notificationResult = await pool.query(
          `INSERT INTO app.notifications (
            notification_id, recipient_id, type, title, message,
            data, read, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id`,
          [
            notificationId,
            admin.id,
            'upgrade_request',
            JSON.stringify({
              ar: '📝 طلب ترقية جديد',
              en: '📝 New Upgrade Request'
            }),
            JSON.stringify({
              ar: `طلب ترقية جديد من ${user.full_name} ليصبح مرشداً سياحياً`,
              en: `New upgrade request from ${user.full_name} to become a tourist guide`
            }),
            JSON.stringify({
              userId: user.id,
              userName: user.full_name,
              userEmail: user.email
            }),
            false,
            now
          ]
        );
        
        notifications.push(notificationResult.rows[0]);
      }

      console.log(`✅ Sent notifications to ${notifications.length} admins`);
      
    } catch (error) {
      console.error('❌ Error notifying admins:', error);
    }
  }

  /**
   * الحصول على طلبات الترقية المعلقة (للمشرفين)
   */
  async getPendingRequests() {
    try {
      const result = await pool.query(
        `SELECT id, full_name, email, phone, created_at,
                guide_data->'upgradeRequest' as upgrade_request
         FROM app.users
         WHERE guide_data->'upgradeRequest'->>'status' = 'pending'
         ORDER BY created_at DESC`
      );
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting pending requests:', error);
      throw error;
    }
  }

  /**
   * الموافقة على طلب ترقية
   */
  async approveRequest(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // تحديث نوع المستخدم إلى مرشد
      const updateResult = await client.query(
        `UPDATE app.users 
         SET type = 'guide',
             role = 'guide',
             guide_data = jsonb_set(
               COALESCE(guide_data, '{}'::jsonb),
               '{upgradeRequest,status}',
               '"approved"'
             ),
             guide_data = jsonb_set(
               COALESCE(guide_data, '{}'::jsonb),
               '{upgradeRequest,approvedAt}',
               to_jsonb(NOW())
             ),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, full_name, email`,
        [userId]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('المستخدم غير موجود');
      }

      const user = updateResult.rows[0];

      // إنشاء إشعار للمستخدم
      const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      
      await client.query(
        `INSERT INTO app.notifications (
          notification_id, recipient_id, type, title, message,
          read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          notificationId,
          userId,
          'upgrade_approved',
          JSON.stringify({
            ar: '✅ تمت الموافقة على طلبك',
            en: '✅ Your Request has been Approved'
          }),
          JSON.stringify({
            ar: 'تهانينا! تمت الموافقة على طلب ترقيتك لتصبح مرشداً سياحياً. يمكنك الآن إنشاء برامج سياحية',
            en: 'Congratulations! Your request to become a tourist guide has been approved. You can now create tour programs'
          }),
          false,
          new Date()
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'تمت الموافقة على الطلب بنجاح',
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error approving request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * رفض طلب ترقية
   */
  async rejectRequest(userId, reason) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // تحديث حالة الطلب إلى مرفوض
      const updateResult = await client.query(
        `UPDATE app.users 
         SET guide_data = jsonb_set(
               jsonb_set(
                 COALESCE(guide_data, '{}'::jsonb),
                 '{upgradeRequest,status}',
                 '"rejected"'
               ),
               '{upgradeRequest,rejectedAt}',
               to_jsonb(NOW())
             ),
             guide_data = jsonb_set(
               COALESCE(guide_data, '{}'::jsonb),
               '{upgradeRequest,rejectionReason}',
               $1
             ),
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, full_name, email`,
        [JSON.stringify(reason), userId]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('المستخدم غير موجود');
      }

      const user = updateResult.rows[0];

      // إنشاء إشعار للمستخدم
      const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      
      await client.query(
        `INSERT INTO app.notifications (
          notification_id, recipient_id, type, title, message,
          data, read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          notificationId,
          userId,
          'upgrade_rejected',
          JSON.stringify({
            ar: '❌ عذراً، لم تتم الموافقة على طلبك',
            en: '❌ Your Request has been Rejected'
          }),
          JSON.stringify({
            ar: `لم تتم الموافقة على طلب ترقيتك للأسف. سبب الرفض: ${reason}`,
            en: `Your upgrade request has been rejected. Reason: ${reason}`
          }),
          JSON.stringify({ reason }),
          false,
          new Date()
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'تم رفض الطلب',
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error rejecting request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * الحصول على إحصائيات المرشدين
   */
  async getGuideStats(guideId) {
    try {
      const statsResult = await pool.query(
        `SELECT 
          COUNT(DISTINCT b.id) as total_bookings,
          COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
          COALESCE(AVG(r.rating), 0) as avg_rating,
          COUNT(DISTINCT r.id) as total_reviews,
          COUNT(DISTINCT p.id) as total_programs
         FROM app.users u
         LEFT JOIN app.bookings b ON b.guide_id = u.id
         LEFT JOIN app.reviews r ON r.guide_id = u.id
         LEFT JOIN app.programs p ON p.guide_id = u.id
         WHERE u.id = $1 AND u.type = 'guide'
         GROUP BY u.id`,
        [guideId]
      );

      if (statsResult.rows.length === 0) {
        return null;
      }

      return statsResult.rows[0];
    } catch (error) {
      console.error('❌ Error getting guide stats:', error);
      throw error;
    }
  }
}

export default new GuideService();
