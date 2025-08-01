import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  DatabaseConnection, 
  DatabaseError, 
  DatabaseUtils, 
  ConnectionPool,
  getDatabaseConnection,
  getDatabaseUtils
} from '../database';

// Mock D1Database interface
const createMockD1Database = () => ({
  prepare: vi.fn(),
  batch: vi.fn(),
  dump: vi.fn(),
  exec: vi.fn()
});

// Mock D1PreparedStatement
const createMockPreparedStatement = () => ({
  bind: vi.fn().mockReturnThis(),
  run: vi.fn(),
  first: vi.fn(),
  all: vi.fn()
});

describe('DatabaseConnection', () => {
  let mockDb: any;
  let mockStmt: any;
  let connection: DatabaseConnection;

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockStmt = createMockPreparedStatement();
    mockDb.prepare.mockReturnValue(mockStmt);
    connection = new DatabaseConnection(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute a prepared statement successfully', async () => {
      const mockResult = { success: true, changes: 1 };
      mockStmt.run.mockResolvedValue(mockResult);

      const result = await connection.execute('INSERT INTO test VALUES (?)', ['value']);

      expect(mockDb.prepare).toHaveBeenCalledWith('INSERT INTO test VALUES (?)');
      expect(mockStmt.bind).toHaveBeenCalledWith('value');
      expect(mockStmt.run).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should handle execution errors', async () => {
      mockStmt.run.mockRejectedValue(new Error('Database error'));

      await expect(connection.execute('INVALID SQL')).rejects.toThrow(DatabaseError);
    });

    it('should work with no parameters', async () => {
      const mockResult = { success: true };
      mockStmt.run.mockResolvedValue(mockResult);

      await connection.execute('SELECT 1');

      expect(mockStmt.bind).toHaveBeenCalledWith();
    });
  });

  describe('first', () => {
    it('should return first result', async () => {
      const mockResult = { id: 1, name: 'test' };
      mockStmt.first.mockResolvedValue(mockResult);

      const result = await connection.first('SELECT * FROM test WHERE id = ?', [1]);

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM test WHERE id = ?');
      expect(mockStmt.bind).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult);
    });

    it('should return null when no result found', async () => {
      mockStmt.first.mockResolvedValue(null);

      const result = await connection.first('SELECT * FROM test WHERE id = ?', [999]);

      expect(result).toBeNull();
    });

    it('should handle first query errors', async () => {
      mockStmt.first.mockRejectedValue(new Error('Query error'));

      await expect(connection.first('INVALID SQL')).rejects.toThrow(DatabaseError);
    });
  });

  describe('all', () => {
    it('should return all results', async () => {
      const mockResults = [{ id: 1 }, { id: 2 }];
      mockStmt.all.mockResolvedValue({ results: mockResults });

      const results = await connection.all('SELECT * FROM test');

      expect(results).toEqual(mockResults);
    });

    it('should return empty array when no results', async () => {
      mockStmt.all.mockResolvedValue({ results: [] });

      const results = await connection.all('SELECT * FROM test WHERE 1=0');

      expect(results).toEqual([]);
    });

    it('should handle all query errors', async () => {
      mockStmt.all.mockRejectedValue(new Error('Query error'));

      await expect(connection.all('INVALID SQL')).rejects.toThrow(DatabaseError);
    });
  });

  describe('batch', () => {
    it('should execute batch statements', async () => {
      const mockResults = [{ success: true }, { success: true }];
      mockDb.batch.mockResolvedValue(mockResults);

      const statements = [
        { sql: 'INSERT INTO test VALUES (?)', params: ['value1'] },
        { sql: 'INSERT INTO test VALUES (?)', params: ['value2'] }
      ];

      const results = await connection.batch(statements);

      expect(mockDb.batch).toHaveBeenCalled();
      expect(results).toEqual(mockResults);
    });

    it('should handle batch with no parameters', async () => {
      const mockResults = [{ success: true }];
      mockDb.batch.mockResolvedValue(mockResults);

      const statements = [{ sql: 'SELECT 1' }];
      await connection.batch(statements);

      expect(mockDb.batch).toHaveBeenCalled();
    });

    it('should handle batch errors', async () => {
      mockDb.batch.mockRejectedValue(new Error('Batch error'));

      const statements = [{ sql: 'INVALID SQL' }];

      await expect(connection.batch(statements)).rejects.toThrow(DatabaseError);
    });
  });

  describe('getInfo', () => {
    it('should return connection info', async () => {
      mockStmt.first.mockResolvedValue({ connected: 1 });

      const info = await connection.getInfo();

      expect(info.connected).toBe(true);
      expect(info.timestamp).toBeDefined();
    });

    it('should handle info query errors', async () => {
      mockStmt.first.mockRejectedValue(new Error('Info error'));

      await expect(connection.getInfo()).rejects.toThrow(DatabaseError);
    });
  });
});

describe('DatabaseError', () => {
  it('should create error with message only', () => {
    const error = new DatabaseError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('DatabaseError');
    expect(error.timestamp).toBeDefined();
    expect(error.sql).toBeUndefined();
    expect(error.params).toBeUndefined();
  });

  it('should create error with SQL and params', () => {
    const error = new DatabaseError('Test error', 'SELECT * FROM test', ['param1']);

    expect(error.sql).toBe('SELECT * FROM test');
    expect(error.params).toEqual(['param1']);
  });

  it('should serialize to JSON correctly', () => {
    const error = new DatabaseError('Test error', 'SELECT 1', ['param']);
    const json = error.toJSON();

    expect(json.name).toBe('DatabaseError');
    expect(json.message).toBe('Test error');
    expect(json.sql).toBe('SELECT 1');
    expect(json.params).toEqual(['param']);
    expect(json.timestamp).toBeDefined();
  });
});

describe('DatabaseUtils', () => {
  let mockDb: any;
  let mockStmt: any;
  let utils: DatabaseUtils;

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockStmt = createMockPreparedStatement();
    mockDb.prepare.mockReturnValue(mockStmt);
    utils = new DatabaseUtils(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('tableExists', () => {
    it('should return true when table exists', async () => {
      mockStmt.first.mockResolvedValue({ name: 'test_table' });

      const exists = await utils.tableExists('test_table');

      expect(exists).toBe(true);
      expect(mockStmt.bind).toHaveBeenCalledWith('test_table');
    });

    it('should return false when table does not exist', async () => {
      mockStmt.first.mockResolvedValue(null);

      const exists = await utils.tableExists('nonexistent_table');

      expect(exists).toBe(false);
    });

    it('should handle table exists errors', async () => {
      mockStmt.first.mockRejectedValue(new Error('Query error'));

      await expect(utils.tableExists('test_table')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getTableSchema', () => {
    it('should return table schema', async () => {
      const mockSchema = [
        { cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
        { cid: 1, name: 'name', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 }
      ];
      mockStmt.all.mockResolvedValue({ results: mockSchema });

      const schema = await utils.getTableSchema('test_table');

      expect(schema).toEqual(mockSchema);
      expect(mockDb.prepare).toHaveBeenCalledWith('PRAGMA table_info(test_table)');
    });

    it('should handle schema query errors', async () => {
      mockStmt.all.mockRejectedValue(new Error('Schema error'));

      await expect(utils.getTableSchema('test_table')).rejects.toThrow(DatabaseError);
    });
  });

  describe('getRowCount', () => {
    it('should return row count without where clause', async () => {
      mockStmt.first.mockResolvedValue({ count: 5 });

      const count = await utils.getRowCount('test_table');

      expect(count).toBe(5);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM test_table');
    });

    it('should return row count with where clause', async () => {
      mockStmt.first.mockResolvedValue({ count: 3 });

      const count = await utils.getRowCount('test_table', 'status = ?', ['active']);

      expect(count).toBe(3);
      expect(mockStmt.bind).toHaveBeenCalledWith('active');
    });

    it('should return 0 when count is null', async () => {
      mockStmt.first.mockResolvedValue(null);

      const count = await utils.getRowCount('test_table');

      expect(count).toBe(0);
    });

    it('should handle row count errors', async () => {
      mockStmt.first.mockRejectedValue(new Error('Count error'));

      await expect(utils.getRowCount('test_table')).rejects.toThrow(DatabaseError);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      // Mock connection info
      mockStmt.first
        .mockResolvedValueOnce({ connected: 1 }) // getInfo call
        .mockResolvedValueOnce({ name: 'GeneratedImages' }) // tableExists for GeneratedImages
        .mockResolvedValueOnce({ name: 'PromptCache' }) // tableExists for PromptCache
        .mockResolvedValueOnce({ count: 10 }) // getRowCount for GeneratedImages
        .mockResolvedValueOnce({ count: 5 }); // getRowCount for PromptCache

      const health = await utils.healthCheck();

      expect(health.connected).toBe(true);
      expect(health.tablesExist).toBe(true);
      expect(health.generatedImagesCount).toBe(10);
      expect(health.promptCacheCount).toBe(5);
      expect(health.timestamp).toBeDefined();
    });

    it('should handle missing tables', async () => {
      mockStmt.first
        .mockResolvedValueOnce({ connected: 1 }) // getInfo call
        .mockResolvedValueOnce(null) // tableExists for GeneratedImages - not found
        .mockResolvedValueOnce({ name: 'PromptCache' }); // tableExists for PromptCache

      const health = await utils.healthCheck();

      expect(health.tablesExist).toBe(false);
      expect(health.generatedImagesCount).toBe(0);
    });

    it('should handle health check errors', async () => {
      mockStmt.first.mockRejectedValue(new Error('Health check error'));

      await expect(utils.healthCheck()).rejects.toThrow(DatabaseError);
    });
  });

  describe('cleanupOldRecords', () => {
    it('should cleanup old records', async () => {
      const mockResult = { changes: 3 };
      mockStmt.run.mockResolvedValue(mockResult);

      const deletedCount = await utils.cleanupOldRecords('test_table', 'created_at', 30);

      expect(deletedCount).toBe(3);
      expect(mockStmt.bind).toHaveBeenCalledWith(expect.any(String));
    });

    it('should return 0 when no changes', async () => {
      const mockResult = { changes: null };
      mockStmt.run.mockResolvedValue(mockResult);

      const deletedCount = await utils.cleanupOldRecords('test_table', 'created_at', 30);

      expect(deletedCount).toBe(0);
    });

    it('should handle cleanup errors', async () => {
      mockStmt.run.mockRejectedValue(new Error('Cleanup error'));

      await expect(utils.cleanupOldRecords('test_table', 'created_at', 30)).rejects.toThrow(DatabaseError);
    });
  });
});

describe('ConnectionPool', () => {
  let pool: ConnectionPool;
  let mockDb: any;

  beforeEach(() => {
    pool = new ConnectionPool();
    mockDb = createMockD1Database();
  });

  afterEach(() => {
    pool.closeAll();
  });

  describe('getConnection', () => {
    it('should create and return new connection', () => {
      const connection = pool.getConnection('test', mockDb);

      expect(connection).toBeInstanceOf(DatabaseConnection);
    });

    it('should return existing connection', () => {
      const connection1 = pool.getConnection('test', mockDb);
      const connection2 = pool.getConnection('test', mockDb);

      expect(connection1).toBe(connection2);
    });
  });

  describe('getUtils', () => {
    it('should return database utils', () => {
      const utils = pool.getUtils('test', mockDb);

      expect(utils).toBeInstanceOf(DatabaseUtils);
    });
  });

  describe('getStats', () => {
    it('should return connection statistics', () => {
      pool.getConnection('test1', mockDb);
      pool.getConnection('test2', mockDb);

      const stats = pool.getStats();

      expect(stats.connectionCount).toBe(2);
      expect(stats.connectionNames).toEqual(['test1', 'test2']);
    });
  });

  describe('closeAll', () => {
    it('should clear all connections', () => {
      pool.getConnection('test', mockDb);
      expect(pool.getStats().connectionCount).toBe(1);

      pool.closeAll();
      expect(pool.getStats().connectionCount).toBe(0);
    });
  });
});

describe('Helper Functions', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockD1Database();
  });

  describe('getDatabaseConnection', () => {
    it('should return database connection', () => {
      const connection = getDatabaseConnection(mockDb);

      expect(connection).toBeInstanceOf(DatabaseConnection);
    });

    it('should throw error when database is null', () => {
      expect(() => getDatabaseConnection(null as any)).toThrow(DatabaseError);
    });

    it('should throw error when database is undefined', () => {
      expect(() => getDatabaseConnection(undefined as any)).toThrow(DatabaseError);
    });
  });

  describe('getDatabaseUtils', () => {
    it('should return database utils', () => {
      const utils = getDatabaseUtils(mockDb);

      expect(utils).toBeInstanceOf(DatabaseUtils);
    });

    it('should throw error when database is null', () => {
      expect(() => getDatabaseUtils(null as any)).toThrow(DatabaseError);
    });

    it('should throw error when database is undefined', () => {
      expect(() => getDatabaseUtils(undefined as any)).toThrow(DatabaseError);
    });
  });
});