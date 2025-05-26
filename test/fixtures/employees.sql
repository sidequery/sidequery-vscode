-- Test SQL file for SideQuery VSCode extension

-- Create a test table
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    department VARCHAR(50),
    salary DECIMAL(10, 2)
);

-- Insert some test data
INSERT INTO employees (id, name, department, salary) VALUES
(1, 'John Doe', 'Engineering', 75000.00),
(2, 'Jane Smith', 'Marketing', 65000.00),
(3, 'Bob Johnson', 'Sales', 70000.00),
(4, 'Alice Brown', 'Engineering', 80000.00);

-- Query all employees
SELECT * FROM employees;

-- Get average salary by department
SELECT 
    department,
    COUNT(*) as employee_count,
    AVG(salary) as avg_salary
FROM employees
GROUP BY department
ORDER BY avg_salary DESC;

-- Find top earners
SELECT name, salary 
FROM employees 
WHERE salary > 70000
ORDER BY salary DESC;