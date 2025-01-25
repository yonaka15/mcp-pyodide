import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const EXECUTE_PYTHON_TOOL: Tool = {
  name: "execute-python",
  description: "Execute Python code using Pyodide with output capture",
  inputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "Python code to execute",
      },
      timeout: {
        type: "number",
        description: "Execution timeout in milliseconds (default: 5000)",
      },
    },
    required: ["code"],
  },
};

export const INSTALL_PYTHON_PACKAGES_TOOL: Tool = {
  name: "install-python-packages",
  description: "Install Python packages using Pyodide",
  inputSchema: {
    type: "object",
    properties: {
      package: {
        type: "string",
        description: "Python package to install",
      },
    },
    required: ["package"],
  },
};
