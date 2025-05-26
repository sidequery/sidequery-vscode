# SideQuery for VSCode

Transform SQL files into interactive notebooks powered by DuckDB.

## Overview

SideQuery is a VSCode extension that turns `.sql` files into executable notebooks. Write queries in cells separated by semicolons, execute them individually or all at once, and see results in formatted tables. For example:

```sql
-- Create table
CREATE TABLE sales (id INT, product VARCHAR, amount DECIMAL);

-- Insert data  
INSERT INTO sales VALUES (1, 'Laptop', 999.99), (2, 'Mouse', 29.99);

-- Analyze
SELECT product, SUM(amount) as total FROM sales GROUP BY product;
```

## Installation

### From VSCode Marketplace

1. Open VSCode
2. Go to Extensions (⇧⌘X / Ctrl+Shift+X)
3. Search for "SideQuery"
4. Click Install

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/sidequery-vscode.git
cd sidequery-vscode

# Install dependencies
bun install

# Compile the extension
bun run compile
bun run compile:renderer

# Open in VSCode
code .
```

Press F5 to run the extension in a new VSCode window.

## Usage

1. **Open any `.sql` file** - It automatically opens as a SQL notebook
2. **Execute queries** - Click play button or press `Shift+Enter`
3. **View results** - Tables appear below each cell

### Keyboard Shortcuts

- **Run Cell**: `Shift+Enter`
- **Run All Cells**: `Ctrl+Shift+Enter` (Cmd+Shift+Enter on Mac)
- **Add Cell Below**: `Ctrl+Enter` (Cmd+Enter on Mac)
- **Delete Cell**: `Ctrl+Shift+D` (Cmd+Shift+D on Mac)

For detailed usage examples and tips, see the [Usage Guide](docs/USAGE_GUIDE.md).

## Development

### Prerequisites

- [Bun](https://bun.sh) (v1.0 or higher)
- [VSCode](https://code.visualstudio.com) (v1.74.0 or higher)
- [DuckDB CLI](https://duckdb.org/docs/installation) (installed and in PATH)

### Setup

```bash
# Install dependencies
bun install

# Run tests
bun test

# Watch mode for development
bun run watch
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:duckdb   # DuckDB executor tests
npm run test:arrow    # Arrow reader tests
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## Troubleshooting

### Common Issues

**DuckDB not found**
- Ensure DuckDB is installed and in your PATH
- Download from: https://duckdb.org/docs/installation

**Extension not activating**
- Check that you're opening a `.sql` file
- Look for errors in Help → Toggle Developer Tools

**Query execution fails**
- Check SQL syntax (DuckDB documentation)
- Ensure previous DDL statements succeeded
- Check for file permissions on temporary directory

## License

MIT License - see [LICENSE](LICENSE) file for details