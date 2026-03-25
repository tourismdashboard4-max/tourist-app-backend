// server/src/controllers/notificationController.js
import notificationService from '../services/notificationService.js';

export const getUserNotifications = async (req, res) => {
  try {
    // ✅ PostgreSQL تستخدم id وليس _id
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      type = 'all', 
      isRead = 'all',
      startDate,
      endDate 
    } = req.query;

    const filters = { type, isRead };
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await notificationService.getUserNotifications(
      userId, 
      parseInt(page), 
      parseInt(limit),
      filters
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ Error in getUserNotifications:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإشعارات',
      error: error.message
    });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('❌ Error in getUnreadCount:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب عدد الإشعارات',
      error: error.message
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await notificationService.markAsRead(userId, notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإشعار غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث الإشعار كمقروء',
      notification
    });
  } catch (error) {
    console.error('❌ Error in markAsRead:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث الإشعار',
      error: error.message
    });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'تم تحديث جميع الإشعارات كمقروءة',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Error in markAllAsRead:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث الإشعارات',
      error: error.message
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await notificationService.deleteNotification(userId, notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإشعار غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم حذف الإشعار بنجاح'
    });
  } catch (error) {
    console.error('❌ Error in deleteNotification:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف الإشعار',
      error: error.message
    });
  }
};

export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.deleteAllNotifications(userId);

    res.json({
      success: true,
      message: 'تم حذف جميع الإشعارات بنجاح',
      deletedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Error in deleteAllNotifications:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف الإشعارات',
      error: error.message
    });
  }
};

// ============================================
// ✅ إنشاء إشعار للمسؤول عند استلام رسالة دعم جديدة (مع منع التكرار)
// ============================================
export const createAdminMessageNotification = async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح. فقط المسؤولون يمكنهم إرسال إشعارات المحادثة'
      });
    }

    const { userId, ticketId, message, userName } = req.body;

    if (!userId || !ticketId || !message) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال userId, ticketId, message'
      });
    }

    // ✅ استخدام الدالة الجديدة التي تمنع التكرار
    const notification = await notificationService.createOrUpdateAdminMessageNotification(
      req.user.id,  // adminId
      userId,
      ticketId,
      message,
      userName
    );

    res.json({
      success: true,
      message: 'تم إرسال إشعار المسؤول بنجاح',
      notification
    });
  } catch (error) {
    console.error('❌ Error in createAdminMessageNotification:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الإشعار',
      error: error.message
    });
  }
};

// ============================================
// ✅ الحصول على إشعارات المسؤول المجمعة (إشعار واحد لكل مستخدم)
// ============================================
export const getGroupedAdminNotifications = async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح. هذه الخدمة متاحة فقط للمسؤولين'
      });
    }
    
    const { page = 1, limit = 20 } = req.query;
    
    const result = await notificationService.getGroupedAdminNotifications(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ Error in getGroupedAdminNotifications:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإشعارات',
      error: error.message
    });
  }
};

// ============================================
// ✅ إنشاء إشعار محادثة مع المسؤول (للتوافق القديم)
// ============================================
export const createChatNotification = async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح. فقط المسؤولون يمكنهم إرسال إشعارات المحادثة'
      });
    }

    const { userId, ticketId, message } = req.body;

    if (!userId || !ticketId || !message) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال userId, ticketId, message'
      });
    }

    const result = await notificationService.createChatNotification(
      userId, 
      req.user.id, 
      ticketId, 
      message
    );

    res.json({
      success: true,
      message: 'تم إرسال إشعار المحادثة بنجاح',
      notification: result.userNotification
    });
  } catch (error) {
    console.error('❌ Error in createChatNotification:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الإشعار',
      error: error.message
    });
  }
};

// ============================================
// ✅ إنشاء إشعار طلب ترقية مع محادثة
// ============================================
export const createUpgradeRequestNotification = async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح. فقط المسؤولون يمكنهم إرسال إشعارات الترقية'
      });
    }

    const { userId, requestId, message } = req.body;

    if (!userId || !requestId || !message) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال userId, requestId, message'
      });
    }

    const result = await notificationService.createUpgradeRequestNotification(
      userId, 
      req.user.id, 
      requestId, 
      message
    );

    res.json({
      success: true,
      message: 'تم إرسال إشعار الترقية بنجاح',
      notification: result.notification
    });
  } catch (error) {
    console.error('❌ Error in createUpgradeRequestNotification:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الإشعار',
      error: error.message
    });
  }
};

// ============================================
// ✅ إنشاء إشعار بنتيجة الترقية (موافقة/رفض)
// ============================================
export const createUpgradeResultNotification = async (req, res) => {
  try {
    const { userId, requestId, status, notes } = req.body;

    if (!userId || !requestId || !status) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال userId, requestId, status'
      });
    }

    const notification = await notificationService.createUpgradeResultNotification(
      userId, 
      requestId, 
      status, 
      notes
    );

    res.json({
      success: true,
      message: 'تم إرسال إشعار نتيجة الترقية بنجاح',
      notification
    });
  } catch (error) {
    console.error('❌ Error in createUpgradeResultNotification:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الإشعار',
      error: error.message
    });
  }
};

// ============================================
// ✅ إنشاء إشعار عام (للمسؤول)
// ============================================
export const createGeneralNotification = async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح. فقط المسؤولون يمكنهم إرسال إشعارات عامة'
      });
    }

    const { userId, title, message, type, actionUrl, data } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال userId, title, message'
      });
    }

    const notification = await notificationService.create(userId, {
      title,
      message,
      type: type || 'system',
      actionUrl: actionUrl || null,
      metadata: data ? JSON.parse(data) : null
    });

    res.json({
      success: true,
      message: 'تم إرسال الإشعار بنجاح',
      notification
    });
  } catch (error) {
    console.error('❌ Error in createGeneralNotification:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الإشعار',
      error: error.message
    });
  }
};

// ============================================
// ✅ إنشاء إشعار للمستخدم عند إرسال رسالة (تأكيد)
// ============================================
export const createUserMessageNotification = async (req, res) => {
  try {
    const { userId, ticketId, message } = req.body;

    if (!userId || !ticketId || !message) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال userId, ticketId, message'
      });
    }

    const notification = await notificationService.createOrUpdateUserMessageNotification(
      userId,
      ticketId,
      message
    );

    res.json({
      success: true,
      message: 'تم إرسال إشعار المستخدم بنجاح',
      notification
    });
  } catch (error) {
    console.error('❌ Error in createUserMessageNotification:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الإشعار',
      error: error.message
    });
  }
};

// ============================================
// ✅ إنشاء إشعار للمستخدم عند رد المسؤول
// ============================================
export const createAdminReplyNotification = async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح. فقط المسؤولون يمكنهم إرسال إشعارات الرد'
      });
    }

    const { userId, ticketId, message } = req.body;
    const adminName = req.user.fullName || req.user.name || 'الدعم الفني';

    if (!userId || !ticketId || !message) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال userId, ticketId, message'
      });
    }

    const notification = await notificationService.createOrUpdateAdminReplyNotification(
      userId,
      ticketId,
      message,
      adminName
    );

    res.json({
      success: true,
      message: 'تم إرسال إشعار رد المسؤول بنجاح',
      notification
    });
  } catch (error) {
    console.error('❌ Error in createAdminReplyNotification:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الإشعار',
      error: error.message
    });
  }
};

// دالة لإنشاء إشعار تجريبي (للتطوير)
export const createTestNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, message, type = 'system', priority = 'medium' } = req.body;

    const notification = await notificationService.create(userId, {
      title: title || 'إشعار تجريبي',
      message: message || 'هذا إشعار تجريبي للتأكد من عمل النظام',
      type,
      priority
    });

    res.json({
      success: true,
      message: 'تم إنشاء الإشعار التجريبي',
      notification
    });
  } catch (error) {
    console.error('❌ Error in createTestNotification:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الإشعار',
      error: error.message
    });
  }
};
