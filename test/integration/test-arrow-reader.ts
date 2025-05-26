#!/usr/bin/env bun

import { readArrowFile } from '../../src/arrowReader';
import { DuckDBExecutor } from '../../src/duckdbExecutor';
import * as fs from 'fs';

console.log('🧪 Testing Arrow Reader\n');

const executor = new DuckDBExecutor();
const testDbPath = '/tmp/test-arrow-reader.db';
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

function assertDeepEqual(actual: any, expected: any, message: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
    }
}

// Tests
await test('Read Arrow file with basic data types', async () => {
    // Create table
    await executor.executeQuery(`
        CREATE TABLE test_basic (
            id INTEGER,
            name VARCHAR(100),
            active BOOLEAN
        )
    `, testDbPath);
    
    await executor.executeQuery(`
        INSERT INTO test_basic VALUES 
        (1, 'Alice', true),
        (2, 'Bob', false),
        (3, 'Charlie', true)
    `, testDbPath);
    
    // Query and get Arrow file
    const result = await executor.executeQuery('SELECT * FROM test_basic ORDER BY id', testDbPath);
    assert(result.success === true, 'Query should succeed');
    assert(result.arrowPath !== undefined, 'Should have Arrow path');
    
    if (result.arrowPath) {
        const arrowData = await readArrowFile(result.arrowPath);
        
        assertDeepEqual(arrowData.columns, ['id', 'name', 'active'], 'Should have correct columns');
        assert(arrowData.rowCount === 3, 'Should have 3 rows');
        assert(arrowData.rows.length === 3, 'Should have 3 row objects');
        
        assertDeepEqual(arrowData.rows[0], {
            id: 1,
            name: 'Alice',
            active: true
        }, 'First row should match');
        
        assertDeepEqual(arrowData.rows[1], {
            id: 2,
            name: 'Bob',
            active: false
        }, 'Second row should match');
    }
});

await test('Read Arrow file with numeric types', async () => {
    await executor.executeQuery(`
        CREATE TABLE test_numeric (
            int_col INTEGER,
            bigint_col BIGINT,
            float_col FLOAT,
            double_col DOUBLE,
            decimal_col DECIMAL(10,2)
        )
    `, testDbPath);
    
    await executor.executeQuery(`
        INSERT INTO test_numeric VALUES 
        (42, 9223372036854775807, 3.14, 2.71828, 123.45),
        (-42, -9223372036854775808, -3.14, -2.71828, -123.45)
    `, testDbPath);
    
    const result = await executor.executeQuery('SELECT * FROM test_numeric ORDER BY int_col', testDbPath);
    
    if (result.arrowPath) {
        const arrowData = await readArrowFile(result.arrowPath);
        
        assert(arrowData.columns.includes('int_col'), 'Should have int_col');
        assert(arrowData.columns.includes('decimal_col'), 'Should have decimal_col');
        assert(arrowData.rowCount === 2, 'Should have 2 rows');
        
        const firstRow = arrowData.rows[0];
        assert(firstRow.int_col === -42, 'Integer should match');
        assert(typeof firstRow.bigint_col === 'bigint', 'BigInt should be bigint type');
        assert(Math.abs(firstRow.float_col - (-3.14)) < 0.1, 'Float should be close');
        assert(Math.abs(firstRow.double_col - (-2.71828)) < 0.00001, 'Double should be close');
        assert(firstRow.decimal_col !== undefined, 'Decimal should be defined');
    }
});

await test('Read Arrow file with date/time types', async () => {
    await executor.executeQuery(`
        CREATE TABLE test_datetime (
            date_col DATE,
            timestamp_col TIMESTAMP
        )
    `, testDbPath);
    
    await executor.executeQuery(`
        INSERT INTO test_datetime VALUES 
        ('2024-01-01', '2024-01-01 12:00:00'),
        ('2024-12-31', '2024-12-31 23:59:59')
    `, testDbPath);
    
    const result = await executor.executeQuery('SELECT * FROM test_datetime ORDER BY date_col', testDbPath);
    
    if (result.arrowPath) {
        const arrowData = await readArrowFile(result.arrowPath);
        
        assert(arrowData.rowCount === 2, 'Should have 2 rows');
        
        const firstRow = arrowData.rows[0];
        assert(firstRow.date_col !== undefined, 'Date should be defined');
        assert(firstRow.timestamp_col !== undefined, 'Timestamp should be defined');
    }
});

await test('Read Arrow file with NULL values', async () => {
    await executor.executeQuery(`
        CREATE TABLE test_nulls (
            id INTEGER,
            nullable_text VARCHAR(100),
            nullable_number DOUBLE
        )
    `, testDbPath);
    
    await executor.executeQuery(`
        INSERT INTO test_nulls VALUES 
        (1, 'has value', 42.0),
        (2, NULL, NULL),
        (3, 'another value', NULL)
    `, testDbPath);
    
    const result = await executor.executeQuery('SELECT * FROM test_nulls ORDER BY id', testDbPath);
    
    if (result.arrowPath) {
        const arrowData = await readArrowFile(result.arrowPath);
        
        assert(arrowData.rowCount === 3, 'Should have 3 rows');
        
        assert(arrowData.rows[1].nullable_text === null, 'Text should be null');
        assert(arrowData.rows[1].nullable_number === null, 'Number should be null');
        assert(arrowData.rows[2].nullable_number === null, 'Number should be null');
    }
});

await test('Read empty Arrow file', async () => {
    await executor.executeQuery(`
        CREATE TABLE test_empty (
            id INTEGER,
            name VARCHAR(100)
        )
    `, testDbPath);
    
    const result = await executor.executeQuery('SELECT * FROM test_empty', testDbPath);
    
    if (result.arrowPath) {
        const arrowData = await readArrowFile(result.arrowPath);
        
        assertDeepEqual(arrowData.columns, ['id', 'name'], 'Should have column names');
        assert(arrowData.rowCount === 0, 'Should have 0 rows');
        assert(arrowData.rows.length === 0, 'Should have empty rows array');
    }
});

await test('Handle large result sets', async () => {
    await executor.executeQuery(`
        CREATE TABLE test_large (
            id INTEGER,
            data VARCHAR(100)
        )
    `, testDbPath);
    
    // Insert 1000 rows
    await executor.executeQuery(`
        INSERT INTO test_large 
        SELECT 
            row_number() OVER () as id,
            'Row ' || row_number() OVER () as data
        FROM generate_series(1, 1000)
    `, testDbPath);
    
    const result = await executor.executeQuery('SELECT * FROM test_large', testDbPath);
    
    if (result.arrowPath) {
        const arrowData = await readArrowFile(result.arrowPath);
        
        assert(arrowData.rowCount === 1000, 'Should have 1000 rows');
        assert(arrowData.rows.length === 1000, 'Should have 1000 row objects');
        assert(arrowData.rows[0].data === 'Row 1', 'First row data should match');
        assert(arrowData.rows[999].data === 'Row 1000', 'Last row data should match');
    }
});

await test('Error handling for non-existent file', async () => {
    try {
        await readArrowFile('/tmp/non-existent-file.arrow');
        throw new Error('Should have thrown error');
    } catch (error: any) {
        assert(error.message.includes('Failed to read Arrow file'), 'Should have correct error message');
    }
});

await test('Error handling for invalid Arrow file', async () => {
    const invalidFile = '/tmp/invalid.arrow';
    fs.writeFileSync(invalidFile, 'This is not an Arrow file');
    
    try {
        await readArrowFile(invalidFile);
        throw new Error('Should have thrown error');
    } catch (error: any) {
        assert(error.message.includes('Failed to read Arrow file'), 'Should have correct error message');
    } finally {
        fs.unlinkSync(invalidFile);
    }
});

// Summary
console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);