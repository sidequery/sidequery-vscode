# SideQuery Usage Guide

This guide covers everything you need to know to use SideQuery effectively.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Usage](#basic-usage)
3. [Advanced Features](#advanced-features)
4. [Working with Data](#working-with-data)
5. [Best Practices](#best-practices)
6. [Examples](#examples)

## Getting Started

### Opening SQL Files

When you open any `.sql` file in VSCode with SideQuery installed, it automatically opens as an interactive notebook. Each SQL statement (separated by semicolons) becomes a separate executable cell.

### Your First Query

1. Create a new file called `test.sql`
2. Add this content:
   ```sql
   SELECT 'Hello, SideQuery!' as message;
   ```
3. Click the play button (▶️) or press `Shift+Enter` to execute

## Basic Usage

### Cell Execution

**Running Individual Cells**
- Click the play button (▶️) next to the cell
- Or place cursor in cell and press `Shift+Enter`

**Running All Cells**
- Use the "Run All" button in the toolbar
- Or press `Ctrl+Shift+Enter` (Cmd+Shift+Enter on Mac)

### Cell Management

**Adding Cells**
- New cells are created automatically when you add semicolons
- Or click "+" button between cells

**Deleting Cells**
- Click the trash icon in the cell toolbar
- Or select cell and press `Ctrl+Shift+D`

### Session Management

Each notebook maintains its own database session:
- Tables created in one notebook persist throughout the session
- Closing and reopening the notebook starts a fresh session
- Multiple notebooks have isolated sessions

## Advanced Features

### Working with CTEs (Common Table Expressions)

```sql
-- Cell 1: Complex analysis with CTEs
WITH monthly_sales AS (
    SELECT 
        DATE_TRUNC('month', order_date) as month,
        SUM(total_amount) as revenue,
        COUNT(DISTINCT customer_id) as customers
    FROM orders
    GROUP BY 1
),
growth_rates AS (
    SELECT 
        month,
        revenue,
        customers,
        LAG(revenue) OVER (ORDER BY month) as prev_revenue,
        (revenue - LAG(revenue) OVER (ORDER BY month)) / 
            LAG(revenue) OVER (ORDER BY month) * 100 as growth_rate
    FROM monthly_sales
)
SELECT * FROM growth_rates
WHERE growth_rate > 10
ORDER BY month;
```

### Window Functions

```sql
-- Cell 2: Ranking and analytics
SELECT 
    product_name,
    category,
    unit_price,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY unit_price DESC) as price_rank,
    PERCENT_RANK() OVER (PARTITION BY category ORDER BY unit_price) as price_percentile,
    AVG(unit_price) OVER (PARTITION BY category) as category_avg_price
FROM products
WHERE discontinued = false;
```

### Using DuckDB Extensions

```sql
-- Cell 3: Working with external data
-- DuckDB can read various file formats directly
SELECT * FROM 'data/customers.csv';
SELECT * FROM 'data/sales.parquet';
SELECT * FROM 'https://example.com/data.json';
```

## Working with Data

### Importing Data

**CSV Files**
```sql
-- Direct read
SELECT * FROM 'path/to/file.csv';

-- With options
SELECT * FROM read_csv_auto('path/to/file.csv', 
    header=true, 
    delimiter=',',
    dateformat='%Y-%m-%d'
);

-- Create table from CSV
CREATE TABLE customers AS 
SELECT * FROM 'customers.csv';
```

**Parquet Files**
```sql
-- Parquet files are perfect for analytical workloads
SELECT * FROM 'sales_data.parquet';

-- Filter pushdown works automatically
SELECT * FROM 'sales_data.parquet'
WHERE year = 2024 AND region = 'North America';
```

**JSON Files**
```sql
-- Read JSON array
SELECT * FROM 'data.json';

-- Read nested JSON
SELECT 
    json_extract(data, '$.user.name') as user_name,
    json_extract(data, '$.user.email') as email
FROM 'nested_data.json';
```

### Exporting Data

```sql
-- Export to CSV
COPY (SELECT * FROM results) TO 'output.csv' (HEADER, DELIMITER ',');

-- Export to Parquet
COPY (SELECT * FROM results) TO 'output.parquet' (FORMAT PARQUET);

-- Export to JSON
COPY (SELECT * FROM results) TO 'output.json' (FORMAT JSON, ARRAY true);
```

### Data Transformation

**Pivoting Data**
```sql
-- Create pivot table
PIVOT (
    SELECT product, month, revenue
    FROM sales
) ON month 
USING SUM(revenue) 
GROUP BY product;
```

**Unpivoting Data**
```sql
-- Unpivot wide format to long format
UNPIVOT (
    SELECT * FROM quarterly_sales
) ON (Q1, Q2, Q3, Q4) 
INTO NAME quarter VALUE revenue;
```

## Best Practices

### 1. Organize Queries Logically

Structure your notebook with clear sections:
```sql
-- ========================================
-- 1. DATA PREPARATION
-- ========================================

CREATE TABLE staging_data AS ...;

-- ========================================
-- 2. DATA CLEANING
-- ========================================

DELETE FROM staging_data WHERE ...;

-- ========================================
-- 3. ANALYSIS
-- ========================================

SELECT ... FROM staging_data;
```

### 2. Use Meaningful Names

```sql
-- Good: Clear, descriptive names
CREATE TABLE customer_purchases_2024 AS ...;

-- Avoid: Unclear abbreviations
CREATE TABLE cp24 AS ...;
```

### 3. Add Comments

```sql
-- Calculate customer lifetime value (CLV)
-- Uses the predictive model based on:
-- - Purchase frequency
-- - Average order value  
-- - Customer lifespan
WITH customer_metrics AS (
    -- ... query
)
```

### 4. Test with Small Data First

```sql
-- Test query logic with LIMIT
SELECT * FROM large_table 
WHERE complex_conditions
LIMIT 100;

-- Once verified, run full query
SELECT * FROM large_table 
WHERE complex_conditions;
```

### 5. Use Transactions for Data Modifications

```sql
-- Start transaction
BEGIN TRANSACTION;

-- Make changes
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 123;
INSERT INTO order_items (order_id, product_id) VALUES (456, 123);

-- Verify changes
SELECT * FROM inventory WHERE product_id = 123;

-- Commit if correct, rollback if not
COMMIT; -- or ROLLBACK;
```

## Examples

### Example 1: Sales Dashboard Data

```sql
-- Cell 1: Load sample sales data
CREATE TABLE sales (
    date DATE,
    product VARCHAR,
    category VARCHAR,
    quantity INTEGER,
    price DECIMAL(10,2),
    customer_id INTEGER
);

INSERT INTO sales VALUES
    ('2024-01-01', 'Laptop Pro', 'Electronics', 2, 1299.99, 101),
    ('2024-01-01', 'Wireless Mouse', 'Accessories', 5, 29.99, 101),
    ('2024-01-02', 'USB-C Cable', 'Accessories', 10, 19.99, 102),
    ('2024-01-02', 'Laptop Pro', 'Electronics', 1, 1299.99, 103),
    ('2024-01-03', 'Keyboard', 'Accessories', 3, 79.99, 104);

-- Cell 2: Daily revenue summary
SELECT 
    date,
    COUNT(DISTINCT customer_id) as customers,
    COUNT(*) as transactions,
    SUM(quantity) as units_sold,
    SUM(quantity * price) as revenue
FROM sales
GROUP BY date
ORDER BY date;

-- Cell 3: Product performance
SELECT 
    product,
    category,
    SUM(quantity) as total_units,
    SUM(quantity * price) as total_revenue,
    AVG(price) as avg_price,
    COUNT(DISTINCT customer_id) as unique_customers
FROM sales
GROUP BY product, category
ORDER BY total_revenue DESC;

-- Cell 4: Category breakdown with running totals
SELECT 
    category,
    date,
    SUM(quantity * price) as daily_revenue,
    SUM(SUM(quantity * price)) OVER (
        PARTITION BY category 
        ORDER BY date 
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as running_total
FROM sales
GROUP BY category, date
ORDER BY category, date;
```

### Example 2: Customer Analysis

```sql
-- Cell 1: Create customer data
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    name VARCHAR,
    email VARCHAR,
    signup_date DATE,
    country VARCHAR
);

CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    order_date DATE,
    total_amount DECIMAL(10,2)
);

-- Cell 2: Customer segmentation by value
WITH customer_stats AS (
    SELECT 
        c.customer_id,
        c.name,
        c.country,
        COUNT(o.order_id) as order_count,
        SUM(o.total_amount) as lifetime_value,
        AVG(o.total_amount) as avg_order_value,
        DATEDIFF('day', c.signup_date, CURRENT_DATE) as days_since_signup
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    GROUP BY c.customer_id, c.name, c.country, c.signup_date
),
value_segments AS (
    SELECT 
        *,
        CASE 
            WHEN lifetime_value >= 10000 THEN 'High Value'
            WHEN lifetime_value >= 1000 THEN 'Medium Value'
            WHEN lifetime_value > 0 THEN 'Low Value'
            ELSE 'No Purchases'
        END as segment
    FROM customer_stats
)
SELECT 
    segment,
    COUNT(*) as customer_count,
    AVG(lifetime_value) as avg_lifetime_value,
    AVG(order_count) as avg_orders,
    AVG(days_since_signup) as avg_customer_age_days
FROM value_segments
GROUP BY segment
ORDER BY avg_lifetime_value DESC;
```

### Example 3: Time Series Analysis

```sql
-- Cell 1: Generate time series data
CREATE TABLE metrics AS
WITH RECURSIVE dates AS (
    SELECT DATE '2024-01-01' as date
    UNION ALL
    SELECT date + INTERVAL 1 DAY
    FROM dates
    WHERE date < DATE '2024-03-31'
)
SELECT 
    date,
    RANDOM() * 1000 + 500 as daily_value,
    CASE DAYOFWEEK(date)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name
FROM dates;

-- Cell 2: Calculate moving averages
SELECT 
    date,
    daily_value,
    AVG(daily_value) OVER (
        ORDER BY date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as moving_avg_7d,
    AVG(daily_value) OVER (
        ORDER BY date 
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) as moving_avg_30d
FROM metrics
ORDER BY date;

-- Cell 3: Weekly aggregations with seasonality
SELECT 
    DATE_TRUNC('week', date) as week_start,
    day_name,
    AVG(daily_value) as avg_value,
    STDDEV(daily_value) as stddev_value,
    MIN(daily_value) as min_value,
    MAX(daily_value) as max_value
FROM metrics
GROUP BY DATE_TRUNC('week', date), day_name
ORDER BY week_start, 
    CASE day_name
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
    END;
```

## Tips and Tricks

### 1. Keyboard Shortcuts

- `Shift+Enter`: Run current cell
- `Ctrl+Enter`: Run cell and insert below
- `Alt+Enter`: Run cell and insert below
- `Ctrl+Shift+Enter`: Run all cells
- `Esc` then `A`: Insert cell above
- `Esc` then `B`: Insert cell below
- `Esc` then `DD`: Delete cell

### 2. Performance Tips

- Use `EXPLAIN` to understand query plans
- Create indexes on frequently filtered columns
- Use column statistics: `ANALYZE table_name`
- Partition large tables by date or category

### 3. Debugging Queries

```sql
-- Use EXPLAIN to see query plan
EXPLAIN SELECT * FROM large_table WHERE condition;

-- Use LIMIT during development
SELECT * FROM (
    -- Complex query here
) LIMIT 10;

-- Check data types
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'your_table';
```

### 4. Memory Management

```sql
-- Check database size
SELECT * FROM duckdb_databases();

-- Check table sizes
SELECT table_name, estimated_size
FROM duckdb_tables();

-- Clear unused tables
DROP TABLE IF EXISTS temp_table;
```

## Conclusion

SideQuery transforms SQL development by providing an interactive notebook environment powered by DuckDB. Whether you're doing data analysis, ETL development, or exploring datasets, SideQuery makes it easier and more enjoyable.

For more information:
- Check the [README](../README.md) for installation
- See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Read [API.md](API.md) for extension API reference