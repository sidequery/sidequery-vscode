# SideQuery Tests

This directory contains the test suite for the SideQuery VSCode extension.

## Structure

```
test/
├── fixtures/                    # Test data and SQL files
│   └── sample-queries.sql
├── integration/                 # Integration tests
│   ├── test-arrow-reader.ts     # Arrow IPC reader tests
│   └── test-duckdb-executor.ts  # DuckDB executor tests
└── run-all-tests.ts            # Main test runner
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:duckdb   # DuckDB executor tests
npm run test:arrow    # Arrow reader tests
```

## Test Coverage

### DuckDB Executor Tests (8 tests)
- Simple SELECT query execution
- Error handling for invalid queries
- CREATE TABLE operations
- INSERT and SELECT workflow
- Arrow extension loading and data export
- Complex aggregation queries
- In-memory database operations
- Query type detection (SELECT vs DDL/DML)

### Arrow Reader Tests (8 tests)
- Reading basic data types (INTEGER, VARCHAR, BOOLEAN)
- Reading numeric types (BIGINT, FLOAT, DOUBLE, DECIMAL)
- Reading date/time types (DATE, TIMESTAMP)
- Handling NULL values
- Reading empty result sets
- Large result sets (1000+ rows)
- Error handling for non-existent files
- Error handling for invalid Arrow files

## Writing New Tests

Tests are written as simple standalone scripts using a minimal test framework:

```typescript
async function test(name: string, fn: () => Promise<void>) {
    try {
        await fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.error(`   ${error}`);
        failed++;
    }
}

// Example test
await test('My test case', async () => {
    const result = await someFunction();
    assert(result === expected, 'Result should match expected value');
});
```

The test files are executable and can be run directly with Bun.