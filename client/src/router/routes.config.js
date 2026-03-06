// ===================== تكوين المسارات =====================
export const ROUTES = {
  // المسارات العامة
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ABOUT: '/about',
  CONTACT: '/contact',
  FAQ: '/faq',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  
  // مسارات المستخدم (سائح)
  PROFILE: '/profile',
  WALLET: '/wallet',
  BOOKINGS: '/bookings',
  BOOKING_DETAILS: '/bookings/:id',
  FAVORITES: '/favorites',
  PROGRAMS: '/programs',
  PROGRAM_DETAILS: '/programs/:id',
  EXPLORE: '/explore',
  EVENTS: '/events',
  
  // مسارات المرشد
  GUIDE_DASHBOARD: '/guide/dashboard',
  GUIDE_PROGRAMS: '/guide/programs',
  GUIDE_PROGRAM_EDIT: '/guide/programs/:id/edit',
  GUIDE_PROGRAM_ADD: '/guide/programs/add',
  GUIDE_EARNINGS: '/guide/earnings',
  GUIDE_REQUESTS: '/guide/requests',
  GUIDE_BOOKINGS: '/guide/bookings',
  GUIDE_STATS: '/guide/stats',
  GUIDE_SETTINGS: '/guide/settings',
  
  // مسارات المحادثة
  CHAT: '/chat',
  CHAT_ROOM: '/chat/:userId',
  CHAT_SUPPORT: '/chat/support',
  
  // ✅ مسارات الإشعارات - مهم جداً
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_SETTINGS: '/notification-settings',
  
  // مسارات الإدارة (للمشرف)
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_GUIDES: '/admin/guides',
  ADMIN_BOOKINGS: '/admin/bookings',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_SETTINGS: '/admin/settings',
};

// ===================== صلاحيات المسارات =====================
export const routePermissions = {
  // مسارات خاصة بالمستخدمين العاديين (سياح)
  [ROUTES.WALLET]: ['tourist'],
  [ROUTES.BOOKINGS]: ['tourist'],
  [ROUTES.BOOKING_DETAILS]: ['tourist'],
  [ROUTES.FAVORITES]: ['tourist'],
  [ROUTES.PROGRAMS]: ['tourist'],
  [ROUTES.PROGRAM_DETAILS]: ['tourist'],
  [ROUTES.EXPLORE]: ['tourist'],
  [ROUTES.EVENTS]: ['tourist'],
  
  // مسارات خاصة بالمرشدين
  [ROUTES.GUIDE_DASHBOARD]: ['guide'],
  [ROUTES.GUIDE_PROGRAMS]: ['guide'],
  [ROUTES.GUIDE_PROGRAM_EDIT]: ['guide'],
  [ROUTES.GUIDE_PROGRAM_ADD]: ['guide'],
  [ROUTES.GUIDE_EARNINGS]: ['guide'],
  [ROUTES.GUIDE_REQUESTS]: ['guide'],
  [ROUTES.GUIDE_BOOKINGS]: ['guide'],
  [ROUTES.GUIDE_STATS]: ['guide'],
  [ROUTES.GUIDE_SETTINGS]: ['guide'],
  
  // مسارات مشتركة للجميع (مسجلين)
  [ROUTES.PROFILE]: ['tourist', 'guide'],
  [ROUTES.CHAT]: ['tourist', 'guide'],
  [ROUTES.CHAT_ROOM]: ['tourist', 'guide'],
  [ROUTES.CHAT_SUPPORT]: ['tourist', 'guide'],
  [ROUTES.NOTIFICATIONS]: ['tourist', 'guide'], // ✅ الإشعارات متاحة للجميع
  [ROUTES.NOTIFICATION_SETTINGS]: ['tourist', 'guide'],
};

// ===================== عناوين الصفحات =====================
export const pageTitles = {
  [ROUTES.HOME]: { ar: 'الرئيسية', en: 'Home' },
  [ROUTES.LOGIN]: { ar: 'تسجيل الدخول', en: 'Login' },
  [ROUTES.REGISTER]: { ar: 'إنشاء حساب', en: 'Register' },
  [ROUTES.ABOUT]: { ar: 'عن التطبيق', en: 'About' },
  [ROUTES.CONTACT]: { ar: 'اتصل بنا', en: 'Contact' },
  [ROUTES.FAQ]: { ar: 'الأسئلة الشائعة', en: 'FAQ' },
  [ROUTES.TERMS]: { ar: 'الشروط والأحكام', en: 'Terms' },
  [ROUTES.PRIVACY]: { ar: 'سياسة الخصوصية', en: 'Privacy' },
  [ROUTES.PROFILE]: { ar: 'الملف الشخصي', en: 'Profile' },
  [ROUTES.WALLET]: { ar: 'المحفظة', en: 'Wallet' },
  [ROUTES.BOOKINGS]: { ar: 'حجوزاتي', en: 'My Bookings' },
  [ROUTES.FAVORITES]: { ar: 'المفضلة', en: 'Favorites' },
  [ROUTES.PROGRAMS]: { ar: 'البرامج السياحية', en: 'Tour Programs' },
  [ROUTES.EXPLORE]: { ar: 'استكشف', en: 'Explore' },
  [ROUTES.EVENTS]: { ar: 'الفعاليات', en: 'Events' },
  [ROUTES.GUIDE_DASHBOARD]: { ar: 'لوحة تحكم المرشد', en: 'Guide Dashboard' },
  [ROUTES.GUIDE_PROGRAMS]: { ar: 'برامجي', en: 'My Programs' },
  [ROUTES.GUIDE_EARNINGS]: { ar: 'الأرباح', en: 'Earnings' },
  [ROUTES.GUIDE_REQUESTS]: { ar: 'طلبات المشاركة', en: 'Requests' },
  [ROUTES.CHAT]: { ar: 'المحادثات', en: 'Chats' },
  [ROUTES.NOTIFICATIONS]: { ar: 'الإشعارات', en: 'Notifications' }, // ✅ عنوان صفحة الإشعارات
  [ROUTES.ADMIN_DASHBOARD]: { ar: 'لوحة الإدارة', en: 'Admin Dashboard' },
};

// ===================== أيقونات المسارات =====================
export const routeIcons = {
  [ROUTES.HOME]: 'home',
  [ROUTES.PROFILE]: 'user',
  [ROUTES.WALLET]: 'wallet',
  [ROUTES.BOOKINGS]: 'calendar',
  [ROUTES.FAVORITES]: 'heart',
  [ROUTES.PROGRAMS]: 'package',
  [ROUTES.EXPLORE]: 'map',
  [ROUTES.EVENTS]: 'calendar',
  [ROUTES.GUIDE_DASHBOARD]: 'users',
  [ROUTES.GUIDE_PROGRAMS]: 'package',
  [ROUTES.GUIDE_EARNINGS]: 'dollar',
  [ROUTES.CHAT]: 'message',
  [ROUTES.NOTIFICATIONS]: 'bell', // ✅ أيقونة الإشعارات
  [ROUTES.SETTINGS]: 'settings',
};

// ===================== القوائم الجانبية =====================
export const sidebarMenus = {
  tourist: [
    { path: ROUTES.PROFILE, label: { ar: 'الملف الشخصي', en: 'Profile' }, icon: 'user' },
    { path: ROUTES.WALLET, label: { ar: 'المحفظة', en: 'Wallet' }, icon: 'wallet' },
    { path: ROUTES.BOOKINGS, label: { ar: 'حجوزاتي', en: 'My Bookings' }, icon: 'calendar' },
    { path: ROUTES.FAVORITES, label: { ar: 'المفضلة', en: 'Favorites' }, icon: 'heart' },
    { path: ROUTES.PROGRAMS, label: { ar: 'البرامج', en: 'Programs' }, icon: 'package' },
    { path: ROUTES.NOTIFICATIONS, label: { ar: 'الإشعارات', en: 'Notifications' }, icon: 'bell' }, // ✅ إضافة الإشعارات
    { path: ROUTES.CHAT, label: { ar: 'المحادثات', en: 'Chats' }, icon: 'message' },
  ],
  guide: [
    { path: ROUTES.GUIDE_DASHBOARD, label: { ar: 'لوحة التحكم', en: 'Dashboard' }, icon: 'dashboard' },
    { path: ROUTES.PROFILE, label: { ar: 'الملف الشخصي', en: 'Profile' }, icon: 'user' },
    { path: ROUTES.GUIDE_PROGRAMS, label: { ar: 'برامجي', en: 'My Programs' }, icon: 'package' },
    { path: ROUTES.GUIDE_BOOKINGS, label: { ar: 'الحجوزات', en: 'Bookings' }, icon: 'calendar' },
    { path: ROUTES.GUIDE_EARNINGS, label: { ar: 'الأرباح', en: 'Earnings' }, icon: 'dollar' },
    { path: ROUTES.GUIDE_REQUESTS, label: { ar: 'الطلبات', en: 'Requests' }, icon: 'users' },
    { path: ROUTES.WALLET, label: { ar: 'المحفظة', en: 'Wallet' }, icon: 'wallet' },
    { path: ROUTES.NOTIFICATIONS, label: { ar: 'الإشعارات', en: 'Notifications' }, icon: 'bell' }, // ✅ إضافة الإشعارات
    { path: ROUTES.CHAT, label: { ar: 'المحادثات', en: 'Chats' }, icon: 'message' },
    { path: ROUTES.GUIDE_SETTINGS, label: { ar: 'الإعدادات', en: 'Settings' }, icon: 'settings' },
  ],
  admin: [
    { path: ROUTES.ADMIN_DASHBOARD, label: { ar: 'لوحة التحكم', en: 'Dashboard' }, icon: 'dashboard' },
    { path: ROUTES.ADMIN_USERS, label: { ar: 'المستخدمين', en: 'Users' }, icon: 'users' },
    { path: ROUTES.ADMIN_GUIDES, label: { ar: 'المرشدين', en: 'Guides' }, icon: 'users' },
    { path: ROUTES.ADMIN_BOOKINGS, label: { ar: 'الحجوزات', en: 'Bookings' }, icon: 'calendar' },
    { path: ROUTES.ADMIN_REPORTS, label: { ar: 'التقارير', en: 'Reports' }, icon: 'file' },
    { path: ROUTES.ADMIN_SETTINGS, label: { ar: 'الإعدادات', en: 'Settings' }, icon: 'settings' },
  ],
};