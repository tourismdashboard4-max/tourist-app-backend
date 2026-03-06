import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { config } from './env.js';

dotenv.config();

/**
 * إعدادات الاتصال بقاعدة البيانات PostgreSQL
 */
const pool = new Pool({
  host: config.database?.host || process.env.DB_HOST || 'localhost',
  port: config.database?.port || process.env.DB_PORT || 5432,
  user: config.database?.user || process.env.DB_USER || 'postgres',
  password: config.database?.password || process.env.DB_PASSWORD || '123456',
  database: config.database?.name || process.env.DB_NAME || 'touristapp',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * الاتصال بقاعدة البيانات
 */
const connectDB = async () => {
  try {
    const client = await pool.connect();
    
    console.log(`
    ┌─────────────────────────────────────┐
    │   ✅ PostgreSQL Connected Successfully │
    ├─────────────────────────────────────┤
    │   Host: ${pool.options.host.padEnd(25)}│
    │   Port: ${pool.options.port.toString().padEnd(25)}│
    │   Database: ${pool.options.database.padEnd(25)}│
    │   User: ${pool.options.user.padEnd(25)}│
    │   Pool Size: 20                      │
    └─────────────────────────────────────┘
    `);

    client.release();

    pool.on('error', (err) => {
      console.error('❌ PostgreSQL connection error:', err);
    });

    pool.on('connect', () => {
      console.log('🔄 New client connected to PostgreSQL');
    });

    pool.on('remove', () => {
      console.log('🔄 Client removed from pool');
    });

    process.on('SIGINT', async () => {
      await pool.end();
      console.log('PostgreSQL connection closed through app termination');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await pool.end();
      console.log('PostgreSQL connection closed through app termination');
      process.exit(0);
    });

    return pool;

  } catch (error) {
    console.error(`
    ┌─────────────────────────────────────┐
    │   ❌ PostgreSQL Connection Failed     │
    ├─────────────────────────────────────┤
    │   Error: ${error.message.substring(0, 30).padEnd(25)}│
    └─────────────────────────────────────┘
    `);

    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

/**
 * التحقق من صحة الاتصال بقاعدة البيانات
 */
const checkDBHealth = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as health_check');
    client.release();

    return {
      status: 'healthy',
      state: 'connected',
      timestamp: new Date().toISOString(),
      database: pool.options.database,
      host: pool.options.host,
      port: pool.options.port,
      poolSize: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
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
 * الحصول على إحصائيات قاعدة البيانات
 */
const getDBStats = async () => {
  try {
    const client = await pool.connect();
    
    const dbSizeResult = await client.query(`
      SELECT pg_database_size($1) as size_bytes
    `, [pool.options.database]);

    const connectionsResult = await client.query(`
      SELECT count(*) as active_connections
      FROM pg_stat_activity
      WHERE datname = $1 AND state = 'active'
    `, [pool.options.database]);

    const tablesResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        pg_total_relation_size(schemaname||'.'||tablename) as total_size_bytes,
        pg_relation_size(schemaname||'.'||tablename) as table_size_bytes,
        pg_indexes_size(schemaname||'.'||tablename) as index_size_bytes
      FROM pg_tables
      WHERE schemaname = 'app'
      ORDER BY tablename
    `);

    client.release();

    const tables = await Promise.all(tablesResult.rows.map(async (row) => {
      const countClient = await pool.connect();
      const countResult = await countClient.query(
        `SELECT count(*) as count FROM ${row.schemaname}.${row.tablename}`
      );
      countClient.release();

      return {
        schema: row.schemaname,
        name: row.tablename,
        count: parseInt(countResult.rows[0].count),
        totalSize: formatBytes(row.total_size_bytes),
        tableSize: formatBytes(row.table_size_bytes),
        indexSize: formatBytes(row.index_size_bytes)
      };
    }));

    return {
      database: pool.options.database,
      size: formatBytes(parseInt(dbSizeResult.rows[0].size_bytes)),
      connections: {
        active: parseInt(connectionsResult.rows[0].active_connections),
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      },
      tables: tables,
      pool: {
        max: pool.options.max,
        min: pool.options.min,
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
      console.log(`🔄 Query retry ${i + 1}/${retries}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw lastError;
};

/**
 * تهيئة قاعدة البيانات
 */
const initializeDB = async () => {
  try {
    await connectDB();
    console.log('🚀 Database initialization completed successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

/**
 * قطع الاتصال بقاعدة البيانات
 */
const disconnectDB = async () => {
  try {
    await pool.end();
    console.log('🔌 PostgreSQL disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting PostgreSQL:', error);
  }
};

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