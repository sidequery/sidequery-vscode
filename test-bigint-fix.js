"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const duckdbExecutor_1 = require("./src/duckdbExecutor");
const arrowReader_1 = require("./src/arrowReader");
const fs = require("fs");
async function testBigIntFix() {
    console.log('Testing BigInt and numeric fixes...\n');
    const executor = new duckdbExecutor_1.DuckDBExecutor();
    const testDb = '/tmp/test-bigint.db';
    try {
        // Clean up
        try {
            fs.unlinkSync(testDb);
        }
        catch (e) { }
        // Test case from the issue
        console.log('1. Creating employees table...');
        await executor.executeQuery(`
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY,
                name VARCHAR(100),
                department VARCHAR(50),
                salary DECIMAL(10, 2)
            )
        `, testDb);
        console.log('2. Inserting data...');
        await executor.executeQuery(`
            INSERT INTO employees (id, name, department, salary) VALUES
            (1, 'John Doe', 'Engineering', 75000.00),
            (2, 'Jane Smith', 'Marketing', 65000.00),
            (3, 'Bob Johnson', 'Sales', 70000.00),
            (4, 'Alice Brown', 'Engineering', 80000.00)
        `, testDb);
        console.log('3. Testing aggregation query...');
        const result = await executor.executeQuery(`
            SELECT 
                department,
                COUNT(*) as employee_count,
                AVG(salary) as avg_salary
            FROM employees
            GROUP BY department
            ORDER BY avg_salary DESC
        `, testDb);
        if (result.success && result.arrowPath) {
            console.log('\n4. Reading Arrow file...');
            const arrowData = await (0, arrowReader_1.readArrowFile)(result.arrowPath);
            console.log('Columns:', arrowData.columns);
            console.log('\nRows:');
            arrowData.rows.forEach((row, i) => {
                console.log(`Row ${i + 1}:`, row);
                Object.entries(row).forEach(([key, value]) => {
                    console.log(`  ${key}: ${value} (type: ${typeof value})`);
                });
            });
            // Test JSON serialization
            console.log('\n5. Testing JSON serialization...');
            try {
                const jsonStr = JSON.stringify(arrowData);
                console.log('✅ JSON serialization successful!');
                // Verify the data
                const parsed = JSON.parse(jsonStr);
                console.log('\nParsed data sample:');
                console.log('First row:', parsed.rows[0]);
            }
            catch (e) {
                console.error('❌ JSON serialization failed:', e);
            }
            // Clean up
            fs.unlinkSync(result.arrowPath);
        }
        // Also test simple numeric query
        console.log('\n6. Testing simple numeric query...');
        const numericResult = await executor.executeQuery('SELECT 1 as num, 2.5 as decimal, 1000000 as big_num', testDb);
        if (numericResult.success && numericResult.arrowPath) {
            const numericData = await (0, arrowReader_1.readArrowFile)(numericResult.arrowPath);
            console.log('Numeric data:', numericData.rows[0]);
            // Test serialization
            try {
                JSON.stringify(numericData);
                console.log('✅ Numeric JSON serialization successful!');
            }
            catch (e) {
                console.error('❌ Numeric JSON serialization failed:', e);
            }
            fs.unlinkSync(numericResult.arrowPath);
        }
    }
    catch (error) {
        console.error('Test error:', error);
    }
    finally {
        // Clean up
        executor.cleanup();
        try {
            fs.unlinkSync(testDb);
        }
        catch (e) { }
    }
}
testBigIntFix().catch(console.error);
//# sourceMappingURL=test-bigint-fix.js.map