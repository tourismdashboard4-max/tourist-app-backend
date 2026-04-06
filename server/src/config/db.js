const mongoose = require('mongoose');

/**
 * الاتصال بقاعدة بيانات MongoDB
 * @returns {Promise<mongoose.Connection>}
 */
const connectDB = async () => {
  // تجنب إنشاء اتصالات متعددة في بيئة التطوير
  if (mongoose.connection.readyState >= 1) {
    console.log('✅ MongoDB already connected');
    return mongoose.connection;
  }

  try {
    // خيارات الاتصال – مناسبة للإصدارات الحديثة من Mongoose (6+)
    const options = {
      useNewUrlParser: true,      // لا يزال مفيداً للإصدارات الأقدم
      useUnifiedTopology: true,   // يضمن استخدام محرك المراقبة الجديد
      serverSelectionTimeoutMS: 5000, // مهلة اختيار الخادم (5 ثوانٍ)
      socketTimeoutMS: 45000,          // مهلة socket
      family: 4,                       // استخدام IPv4 (يتجنب مشاكل IPv6 في بعض البيئات)
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database Name: ${conn.connection.name}`);
    console.log(`🔢 Connection State: ${mongoose.STATES[conn.connection.readyState]}`);

    // التعامل مع أحداث الاتصال
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      // يمكن إعادة المحاولة أو إنهاء العملية حسب احتياجك
      if (err.name === 'MongoNetworkError') {
        console.error('⚠️ Network error – check your connection string or network');
      }
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected – attempting to reconnect...');
      // يمكنك إضافة منطق إعادة محاولة مخصص هنا
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // إغلاق الاتصال بأمان عند إنهاء التطبيق
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️ Received ${signal}, closing MongoDB connection...`);
      try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error closing MongoDB connection:', err);
        process.exit(1);
      }
    };

    // الاستماع لإشارات الإنهاء
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    // طباعة تفاصيل إضافية للمساعدة في التصحيح
    if (error.name === 'MongooseServerSelectionError') {
      console.error('   💡 تأكد من أن MONGODB_URI صحيح وأن الخادم يعمل');
      console.error(`   🔍 URI المستخدم: ${process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    }
    // إعادة رمية الخطأ للتعامل معه في المستوى الأعلى بدلاً من إنهاء التطبيق فوراً
    throw error;
  }
};

module.exports = connectDB;
