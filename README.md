# mcp-pyodide

A Pyodide server implementation for the Model Context Protocol (MCP). This server enables Large Language Models (LLMs) to execute Python code through the MCP interface.

## Features

- Python code execution capability for LLMs using Pyodide
- MCP compliant server implementation
- Robust implementation written in TypeScript
- Available as a command-line tool

## Installation

```bash
npm install mcp-pyodide
```

## Usage

### As a Server

```typescript
import { runServer } from 'mcp-pyodide';

// Start the server
runServer().catch((error: unknown) => {
  console.error("Error starting server:", error);
  process.exit(1);
});
```

### As a Command-line Tool

```bash
mcp-pyodide
```

## Project Structure

```
mcp-pyodide/
├── src/
│   ├── formatters/    # Data formatting handlers
│   ├── handlers/      # Request handlers
│   ├── lib/          # Library code
│   ├── tools/        # Utility tools
│   ├── utils/        # Utility functions
│   └── index.ts      # Main entry point
├── build/            # Build artifacts
├── pyodide-packages/ # Pyodide-related packages
└── package.json
```

## Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK (^1.4.0)
- `pyodide`: Python runtime environment (^0.27.1)
- `arktype`: Type validation library (^2.0.1)

## Development

### Requirements

- Node.js 18 or higher
- npm 9 or higher

### Setup

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Build
npm run build
```

### Scripts

- `npm run build`: Compile TypeScript and set execution permissions

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -am 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## Important Notes

- This project is under development, and the API may change
- Thoroughly test before using in production
- Exercise caution when executing untrusted code for security reasons

## Support

Please use the Issue tracker for problems and questions.