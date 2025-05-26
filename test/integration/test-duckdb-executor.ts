#!/usr/bin/env bun

import { DuckDBExecutor } from '../../src/duckdbExecutor';
import * as fs from 'fs';

console.log('🧪 Testing DuckDB Executor\n');

const executor = new DuckDBExecutor();
const testDbPath = '/tmp/test-duckdb-executor.db';
let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
    try {
        // Setup
        try { fs.unlinkSync(testDbPath); } catch (e) {}
        
        await fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.error(`   ${error}`);
        failed++;
    } finally {
        // Cleanup
        executor.cleanup();
        try { fs.unlinkSync(testDbPath); } catch (e) {}
    }
}

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

// Tests
await test('Simple SELECT query', async () => {
    const result = await executor.executeQuery('SELECT 1 as num, \'hello\' as msg', testDbPath);
    assert(result.success === true, 'Query should succeed');
    assert(result.arrowPath !== undefined, 'Should produce Arrow file');
    assert(result.rowCount === 1, 'Should have 1 row');
    assert(result.executionTime! > 0, 'Should have execution time');
});

await test('Invalid query error handling', async () => {
    const result = await executor.executeQuery('SELECT * FROM nonexistent_table', testDbPath);
    assert(result.success === false, 'Query should fail');
    assert(result.error !== undefined, 'Should have error message');
    assert(result.error!.includes('nonexistent_table'), 'Error should mention missing table');
});

await test('CREATE TABLE', async () => {
    const result = await executor.executeQuery(`
        CREATE TABLE test_table (
            id INTEGER PRIMARY KEY,
            name VARCHAR(100),
            value DECIMAL(10,2)
        )
    `, testDbPath);
    assert(result.success === true, 'CREATE should succeed');
    assert(result.arrowPath === undefined, 'DDL should not produce Arrow file');
});

await test('INSERT and SELECT workflow', async () => {
    // Create table
    await executor.executeQuery(`
        CREATE TABLE employees (
            id INTEGER PRIMARY KEY,
            name VARCHAR(100),
            salary DECIMAL(10,2)
        )
    `, testDbPath);
    
    // Insert data
    const insertResult = await executor.executeQuery(`
        INSERT INTO employees (id, name, salary) VALUES
        (1, 'Alice', 75000.00),
        (2, 'Bob', 65000.00),
        (3, 'Charlie', 70000.00)
    `, testDbPath);
    assert(insertResult.success === true, 'INSERT should succeed');
    
    // Select data
    const selectResult = await executor.executeQuery('SELECT * FROM employees ORDER BY id', testDbPath);
    assert(selectResult.success === true, 'SELECT should succeed');
    assert(selectResult.rowCount === 3, 'Should have 3 rows');
    assert(selectResult.arrowPath !== undefined, 'Should produce Arrow file');
});

await test('Arrow extension loads correctly', async () => {
    // Create and populate table
    await executor.executeQuery(`
        CREATE TABLE test_arrow (
            id INTEGER,
            value DECIMAL(10,2)
        )
    `, testDbPath);
    
    await executor.executeQuery(`
        INSERT INTO test_arrow VALUES 
        (1, 100.50),
        (2, 200.75),
        (3, 300.00)
    `, testDbPath);
    
    // Query with Arrow export
    const result = await executor.executeQuery('SELECT * FROM test_arrow', testDbPath);
    assert(result.success === true, 'Query should succeed');
    assert(result.arrowPath !== undefined, 'Should produce Arrow file');
    assert(result.rowCount === 3, 'Should have correct row count');
    
    // Verify Arrow file exists
    if (result.arrowPath) {
        assert(fs.existsSync(result.arrowPath), 'Arrow file should exist');
        const stats = fs.statSync(result.arrowPath);
        assert(stats.size > 0, 'Arrow file should have content');
    }
});

await test('Complex aggregation query', async () => {
    // Create TPC-H style table
    await executor.executeQuery(`
        CREATE TABLE lineitem (
            l_extendedprice DECIMAL(15,2),
            l_discount DECIMAL(15,2),
            l_shipdate DATE,
            l_quantity DECIMAL(15,2)
        )
    `, testDbPath);
    
    await executor.executeQuery(`
        INSERT INTO lineitem VALUES 
        (10000.00, 0.06, '1994-01-01', 20),
        (20000.00, 0.05, '1994-06-01', 23),
        (30000.00, 0.07, '1994-12-01', 10)
    `, testDbPath);
    
    // Complex aggregation
    const result = await executor.executeQuery(`
        SELECT
            sum(l_extendedprice * l_discount) AS revenue
        FROM
            lineitem
        WHERE
            l_shipdate >= CAST('1994-01-01' AS date)
            AND l_shipdate < CAST('1995-01-01' AS date)
            AND l_discount BETWEEN 0.05 AND 0.07
            AND l_quantity < 24
    `, testDbPath);
    
    assert(result.success === true, 'Aggregation query should succeed');
    assert(result.rowCount === 1, 'Should have 1 result row');
});

await test('In-memory database', async () => {
    const result = await executor.executeQuery('SELECT 42 as answer', ':memory:');
    assert(result.success === true, 'Memory query should succeed');
    assert(result.rowCount === 1, 'Should have 1 row');
    assert(result.arrowPath !== undefined, 'Should produce Arrow file');
});

await test('Query type detection', async () => {
    // Test SELECT-like queries
    const selectQueries = [
        'SELECT * FROM test',
        'WITH cte AS (SELECT 1) SELECT * FROM cte',
        'TABLE test',
        'VALUES (1), (2), (3)'
    ];
    
    for (const query of selectQueries) {
        const result = await executor.executeQuery(query, ':memory:');
        // Even if query fails, it should attempt Arrow export
        assert(result.arrowPath !== undefined || result.error !== undefined, 
               `Query "${query}" should attempt Arrow export or have error`);
    }
    
    // Test non-SELECT queries
    const nonSelectQueries = [
        'CREATE TABLE test (id INT)',
        'DROP TABLE IF EXISTS test'
    ];
    
    for (const query of nonSelectQueries) {
        const result = await executor.executeQuery(query, ':memory:');
        assert(result.arrowPath === undefined, 
               `Query "${query}" should not produce Arrow file`);
    }
});

// Summary
console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);