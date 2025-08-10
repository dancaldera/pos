# Development Tools

This directory contains scripts and tools for managing the monorepo development workflow.

## Scripts

### `scripts/dev.js`
Starts both frontend and backend development servers concurrently with proper output labeling.

**Usage:**
```bash
pnpm dev
# or
node tools/scripts/dev.js
```

**Features:**
- Concurrent execution of frontend and backend dev servers
- Labeled output for easy identification
- Graceful shutdown handling
- Process cleanup on exit

### `scripts/build.js`
Builds all workspaces in the correct dependency order.

**Usage:**
```bash
pnpm build
# or
node tools/scripts/build.js
```

**Build Order:**
1. Shared package (types and utilities)
2. Backend (API server)
3. Frontend (React application)

### `scripts/validate.js`
Validates the monorepo setup and configuration.

**Usage:**
```bash
pnpm validate
# or
node tools/scripts/validate.js
```

**Checks:**
- Workspace configuration files exist
- Package dependencies are properly configured
- TypeScript project references are set up
- Development scripts are available

## Adding New Scripts

When adding new development tools:

1. Create the script in the `scripts/` directory
2. Make it executable: `chmod +x scripts/your-script.js`
3. Add a shebang line: `#!/usr/bin/env node`
4. Add the script to root `package.json` if it should be easily accessible
5. Document it in this README

## Best Practices

- Use ES modules (`import`/`export`) for consistency
- Handle process signals for graceful shutdown
- Provide clear output with appropriate prefixes
- Exit with proper codes (0 for success, non-zero for errors)
- Include error handling and validation