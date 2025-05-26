# Contributing to SideQuery

First off, thank you for considering contributing to SideQuery! It's people like you that make SideQuery such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

**Bug Report Template:**
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Open file '...'
2. Execute query '....'
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS 13.0]
 - VSCode Version: [e.g. 1.74.0]
 - Extension Version: [e.g. 0.0.1]
 - DuckDB Version: [e.g. 0.9.0]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- A clear and descriptive title
- A detailed description of the proposed enhancement
- Explain why this enhancement would be useful
- List any alternative solutions you've considered

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Install dependencies**: `bun install`
3. **Make your changes**: 
   - Add tests if you've added code that should be tested
   - Update documentation if you've changed APIs
   - Ensure your code follows the existing style
4. **Run tests**: `bun test`
5. **Commit your changes**: Use clear, descriptive commit messages
6. **Push to your fork** and submit a pull request

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- [VSCode](https://code.visualstudio.com) v1.74.0+
- [DuckDB CLI](https://duckdb.org/docs/installation) (must be in PATH)
- [Git](https://git-scm.com/)

### Setting Up Your Development Environment

```bash
# Clone your fork
git clone https://github.com/your-username/sidequery-vscode.git
cd sidequery-vscode

# Add upstream remote
git remote add upstream https://github.com/original/sidequery-vscode.git

# Install dependencies
bun install

# Run the extension in development mode
# Press F5 in VSCode to launch a new window with the extension loaded
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write meaningful commit messages
   - Keep commits focused and atomic
   - Add tests for new functionality

3. **Test your changes**
   ```bash
   # Run all tests
   bun test
   
   # Run specific test suite
   bun run test:duckdb
   bun run test:arrow
   
   # Test the extension manually
   # Press F5 in VSCode to launch extension
   ```

4. **Update documentation**
   - Update README.md if needed
   - Add JSDoc comments to new functions
   - Update API documentation if you've changed public APIs

5. **Submit PR**
   - Push your branch to your fork
   - Create a pull request from your fork to the upstream main branch
   - Fill out the PR template completely

## Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let` when possible
- Use meaningful variable and function names
- Add type annotations for function parameters and return types
- Use interfaces for object types

**Example:**
```typescript
interface QueryResult {
    success: boolean;
    data?: any[];
    error?: string;
}

async function executeQuery(sql: string, database: string): Promise<QueryResult> {
    // Implementation
}
```

### Naming Conventions

- **Files**: camelCase (e.g., `sqlParser.ts`)
- **Classes**: PascalCase (e.g., `DuckDBExecutor`)
- **Functions/Methods**: camelCase (e.g., `parseStatements`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Interfaces**: PascalCase with "I" prefix discouraged

### Comments and Documentation

- Write self-documenting code
- Add comments for complex logic
- Use JSDoc for public APIs
- Keep comments up to date with code changes

**Example:**
```typescript
/**
 * Parses SQL content into individual statements
 * @param content - The SQL content to parse
 * @returns Array of SQL statements with position information
 */
export function parseStatements(content: string): SqlStatement[] {
    // Implementation
}
```

## Testing Guidelines

### Writing Tests

- Write tests for all new functionality
- Follow the existing test structure
- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies when appropriate

**Example:**
```typescript
await test('should parse multiple SQL statements', async () => {
    const sql = 'SELECT 1; SELECT 2;';
    const statements = parseStatements(sql);
    assert(statements.length === 2, 'Should have 2 statements');
});
```

### Test Organization

- Place integration tests in `test/integration/`
- Place unit tests alongside source files as `*.test.ts`
- Use fixtures for test data in `test/fixtures/`

## Project Structure

```
sidequery-vscode/
├── src/                    # Source code
│   ├── extension.ts       # Extension entry point
│   ├── *Controller.ts     # Controllers
│   ├── *Executor.ts       # Executors
│   └── *.ts              # Other modules
├── test/                  # Test files
│   ├── integration/      # Integration tests
│   └── fixtures/         # Test data
├── docs/                 # Documentation
├── .vscode/             # VSCode settings
└── package.json         # Extension manifest
```

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create a git tag: `git tag v0.0.1`
4. Push tag: `git push origin v0.0.1`
5. GitHub Actions will automatically publish to marketplace

## Questions?

Feel free to:
- Open an issue for questions
- Join our Discord server (link in README)
- Email maintainers (see package.json)

Thank you for contributing! 🎉