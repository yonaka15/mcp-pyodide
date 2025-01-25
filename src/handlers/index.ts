import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { type } from "arktype";

import * as tools from "../tools/index.js";
import { PyodideManager } from "../lib/pyodide/pyodide-manager.js";
import { formatError } from "../formatters/index.js";

// Create a server instance
const server = new Server(
  {
    name: "mcp-pyodide",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const TOOLS: Tool[] = [
  tools.EXECUTE_PYTHON_TOOL,
  tools.INSTALL_PYTHON_PACKAGES_TOOL,
  tools.GET_MOUNT_POINTS_TOOL,
  tools.LIST_MOUNTED_DIRECTORY_TOOL,
];

const isExecutePythonArgs = type({
  code: "string",
  "timeout?": "number",
});

const isInstallPythonPackagesArgs = type({
  package: "string",
});

const isListMountedDirectoryArgs = type({
  mountName: "string",
});

// Tools list handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("No arguments provided");
    }

    const pyodideManager = PyodideManager.getInstance();

    switch (name) {
      case "execute-python": {
        const executePythonArgs = isExecutePythonArgs(args);
        if (executePythonArgs instanceof type.errors) {
          throw executePythonArgs;
        }
        const { code, timeout = 5000 } = executePythonArgs;
        const results = await pyodideManager.executePython(code, timeout);
        return results;
      }
      case "install-python-packages": {
        const installPythonPackagesArgs = isInstallPythonPackagesArgs(args);
        if (installPythonPackagesArgs instanceof type.errors) {
          throw installPythonPackagesArgs;
        }
        const { package: packageName } = installPythonPackagesArgs;
        const results = await pyodideManager.installPackage(packageName);
        return results;
      }
      case "get-mount-points": {
        const results = await pyodideManager.getMountPoints();
        return results;
      }
      case "list-mounted-directory": {
        const listMountedDirectoryArgs = isListMountedDirectoryArgs(args);
        if (listMountedDirectoryArgs instanceof type.errors) {
          throw listMountedDirectoryArgs;
        }
        const { mountName } = listMountedDirectoryArgs;
        const results = await pyodideManager.listMountedDirectory(mountName);
        return results;
      }
      default: {
        return formatError(`Unknown tool: ${name}`);
      }
    }
  } catch (error) {
    return formatError(error);
  }
});

// Start server
async function runServer() {
  const pyodideManager = PyodideManager.getInstance();

  const cacheDir = process.env.PYODIDE_CACHE_DIR || "./cache";
  const dataDir = process.env.PYODIDE_DATA_DIR || "./data";

  // Initialize Pyodide
  if (!(await pyodideManager.initialize(cacheDir))) {
    console.error("Failed to initialize Pyodide");
    return;
  }

  // Mount directories from environment variables
  await pyodideManager.mountDirectory("data", dataDir);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pyodide MCP Server running on stdio");
}

// Exports
export { runServer };
