// server/src/controllers/notificationController.js
import notificationService from '../services/notificationService.js';

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
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
    console.error('Error in getUserNotifications:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإشعارات',
      error: error.message
    });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب عدد الإشعارات',
      error: error.message
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
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
    console.error('Error in markAsRead:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث الإشعار',
      error: error.message
    });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'تم تحديث جميع الإشعارات كمقروءة',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث الإشعارات',
      error: error.message
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user._id;
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
    console.error('Error in deleteNotification:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف الإشعار',
      error: error.message
    });
  }
};

export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await notificationService.deleteAllNotifications(userId);

    res.json({
      success: true,
      message: 'تم حذف جميع الإشعارات بنجاح',
      deletedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in deleteAllNotifications:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف الإشعارات',
      error: error.message
    });
  }
};

// دالة لإنشاء إشعار تجريبي (للتطوير)
export const createTestNotification = async (req, res) => {
  try {
    const userId = req.user._id;
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
    console.error('Error in createTestNotification:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الإشعار',
      error: error.message
    });
  }
};