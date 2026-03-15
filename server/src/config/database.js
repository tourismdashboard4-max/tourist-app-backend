import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { config } from './env.js';

dotenv.config();

/**
 * إعدادات الاتصال بقاعدة البيانات PostgreSQL السحابية (Supabase)
 */
const poolConfig = {
  // استخدام DATABASE_URL من متغيرات البيئة (مضبوط للسحابي)
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.sqcdxhmnrbazrzeswxmv:1Z8EorhYqsAClmLn@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  
  // إعدادات SSL الإضافية (مهم للسحابي)
  ssl: {
    rejectUnauthorized: false // ضروري لـ Supabase
  },
  
  // إعدادات pool
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  
  // إعدادات إضافية للاستقرار
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

// إنشاء pool الاتصال
const pool = new Pool(poolConfig);

/**
 * الاتصال بقاعدة البيانات السحابية
 */
const connectDB = async () => {
  try {
    const client = await pool.connect();
    
    // استخراج معلومات المضيف من connectionString
    const connectionInfo = poolConfig.connectionString;
    const hostMatch = connectionInfo.match(/@([^:]+)/);
    const host = hostMatch ? hostMatch[1] : 'supabase.co';
    
    console.log(`
    ┌─────────────────────────────────────┐
    │   ✅ Supabase PostgreSQL Connected    │
    ├─────────────────────────────────────┤
    │   Host: ${host.padEnd(25)}│
    │   Database: ${poolConfig.connectionString.split('/').pop().split('?')[0].padEnd(25)}│
    │   Type: Cloud (Supabase)            │
    │   SSL: Enabled ✅                   │
    │   Pool Size: 20                     │
    └─────────────────────────────────────┘
    `);

    client.release();

    pool.on('error', (err) => {
      console.error('❌ Supabase PostgreSQL connection error:', err);
    });

    pool.on('connect', () => {
      console.log('🔄 New client connected to Supabase PostgreSQL');
    });

    pool.on('remove', () => {
      console.log('🔄 Client removed from pool');
    });

    // إغلاق الاتصال عند إيقاف التطبيق
    process.on('SIGINT', async () => {
      await pool.end();
      console.log('Supabase PostgreSQL connection closed through app termination');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await pool.end();
      console.log('Supabase PostgreSQL connection closed through app termination');
      process.exit(0);
    });

    return pool;

  } catch (error) {
    console.error(`
    ┌─────────────────────────────────────┐
    │   ❌ Supabase Connection Failed      │
    ├─────────────────────────────────────┤
    │   Error: ${error.message.substring(0, 30).padEnd(25)}│
    │   Time: ${new Date().toLocaleTimeString().padEnd(25)}│
    └─────────────────────────────────────┘
    `);

    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

/**
 * التحقق من صحة الاتصال بقاعدة البيانات السحابية
 */
const checkDBHealth = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as health_check');
    client.release();

    // استعلام إضافي للتأكد من الاتصال بالسحابي
    const versionResult = await pool.query('SELECT version()');
    const isSupabase = versionResult.rows[0].version.includes('PostgreSQL');

    return {
      status: 'healthy',
      state: 'connected',
      type: 'cloud',
      provider: 'Supabase',
      timestamp: new Date().toISOString(),
      database: poolConfig.connectionString.split('/').pop().split('?')[0],
      host: poolConfig.connectionString.match(/@([^:]+)/)?.[1] || 'supabase.co',
      port: 6543,
      ssl: true,
      poolSize: pool.totalCount || 0,
      idleCount: pool.idleCount || 0,
      waitingCount: pool.waitingCount || 0,
      version: versionResult.rows[0].version.substring(0, 50)
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * الحصول على إحصائيات قاعدة البيانات السحابية
 */
const getDBStats = async () => {
  try {
    const client = await pool.connect();
    
    const dbSizeResult = await client.query(`
      SELECT pg_database_size(current_database()) as size_bytes
    `);

    const connectionsResult = await client.query(`
      SELECT count(*) as active_connections
      FROM pg_stat_activity
      WHERE datname = current_database() AND state = 'active'
    `);

    const tablesResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        pg_total_relation_size(schemaname||'.'||tablename) as total_size_bytes
      FROM pg_tables
      WHERE schemaname IN ('public', 'auth')
      ORDER BY schemaname, tablename
      LIMIT 20
    `);

    client.release();

    const tables = await Promise.all(tablesResult.rows.map(async (row) => {
      try {
        const countClient = await pool.connect();
        const countResult = await countClient.query(
          `SELECT count(*) as count FROM ${row.schemaname}.${row.tablename}`
        );
        countClient.release();

        return {
          schema: row.schemaname,
          name: row.tablename,
          count: parseInt(countResult.rows[0].count),
          totalSize: formatBytes(parseInt(row.total_size_bytes))
        };
      } catch (e) {
        return {
          schema: row.schemaname,
          name: row.tablename,
          count: 0,
          totalSize: formatBytes(parseInt(row.total_size_bytes))
        };
      }
    }));

    return {
      database: current_database(),
      provider: 'Supabase (Cloud)',
      size: formatBytes(parseInt(dbSizeResult.rows[0].size_bytes)),
      connections: {
        active: parseInt(connectionsResult.rows[0].active_connections),
        total: pool.totalCount || 0,
        idle: pool.idleCount || 0,
        waiting: pool.waitingCount || 0
      },
      tables: tables,
      pool: {
        max: pool.options.max,
        idleTimeout: pool.options.idleTimeoutMillis
      }
    };
  } catch (error) {
    throw new Error(`Failed to get DB stats: ${error.message}`);
  }
};

/**
 * تنسيق حجم البيانات
 */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * تنفيذ استعلام مع إعادة المحاولة
 */
const executeQuery = async (text, params, retries = 3) => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      lastError = error;
      console.log(`🔄 Query retry ${i + 1}/${retries} - ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw lastError;
};

/**
 * تهيئة قاعدة البيانات السحابية
 */
const initializeDB = async () => {
  try {
    await connectDB();
    console.log('🚀 Supabase database initialization completed successfully');
  } catch (error) {
    console.error('❌ Supabase database initialization failed:', error);
    process.exit(1);
  }
};

/**
 * قطع الاتصال بقاعدة البيانات
 */
const disconnectDB = async () => {
  try {
    await pool.end();
    console.log('🔌 Supabase PostgreSQL disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting Supabase PostgreSQL:', error);
  }
};

/**
 * الحصول على اسم قاعدة البيانات الحالية
 */
const current_database = () => {
  try {
    const connString = poolConfig.connectionString;
    const dbName = connString.split('/').pop().split('?')[0];
    return dbName || 'postgres';
  } catch {
    return 'postgres';
  }
};

// ✅ تصدير جميع الدوال للاستخدام في باقي المشروع
export {
  pool,
  connectDB,
  checkDBHealth,
  getDBStats,
  initializeDB,
  disconnectDB,
  formatBytes,
  executeQuery
};

// ✅ تصدير افتراضي للاتصال
export default connectDB;
