#!/usr/bin/env bun
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const child_process_1 = require("child_process");
console.log('🧪 Running SideQuery Test Suite\n');
const testFiles = [
    './integration/test-duckdb-executor.ts',
    './integration/test-arrow-reader.ts'
];
let totalPassed = 0;
let totalFailed = 0;
async function runTest(testFile) {
    return new Promise((resolve) => {
        const testPath = path.join(__dirname, testFile);
        const proc = (0, child_process_1.spawn)('bun', [testPath], {
            stdio: ['inherit', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (data) => {
            const text = data.toString();
            stdout += text;
            process.stdout.write(data);
        });
        proc.stderr.on('data', (data) => {
            const text = data.toString();
            stderr += text;
            process.stderr.write(data);
        });
        proc.on('close', (code) => {
            // Parse results from output
            const match = stdout.match(/📊 Results: (\d+) passed, (\d+) failed/);
            if (match) {
                resolve({
                    passed: parseInt(match[1]),
                    failed: parseInt(match[2])
                });
            }
            else {
                // If we can't parse, assume failure
                resolve({ passed: 0, failed: 1 });
            }
        });
        proc.on('error', (error) => {
            console.error(`Failed to run ${testFile}:`, error);
            resolve({ passed: 0, failed: 1 });
        });
    });
}
// Run all tests
for (const testFile of testFiles) {
    console.log(`\n📁 ${testFile}`);
    console.log('─'.repeat(50));
    const results = await runTest(testFile);
    totalPassed += results.passed;
    totalFailed += results.failed;
}
// Summary
console.log('\n' + '═'.repeat(50));
console.log('📊 Total Test Summary');
console.log('═'.repeat(50));
console.log(`✅ Passed: ${totalPassed}`);
console.log(`❌ Failed: ${totalFailed}`);
console.log(`📈 Total:  ${totalPassed + totalFailed}`);
console.log('═'.repeat(50) + '\n');
process.exit(totalFailed > 0 ? 1 : 0);
//# sourceMappingURL=run-all-tests.js.map