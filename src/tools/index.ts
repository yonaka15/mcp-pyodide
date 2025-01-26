import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const EXECUTE_PYTHON_TOOL: Tool = {
  name: "execute-python",
  description:
    "Execute Python code using Pyodide with output capture. When generating images, they will be automatically saved to the output directory instead of being displayed. Images can be accessed from the saved file paths that will be included in the output.",
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

export const GET_MOUNT_POINTS_TOOL: Tool = {
  name: "get-mount-points",
  description: "List mounted directories",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const LIST_MOUNTED_DIRECTORY_TOOL: Tool = {
  name: "list-mounted-directory",
  description: "List contents of a mounted directory",
  inputSchema: {
    type: "object",
    properties: {
      mountName: {
        type: "string",
        description: "Name of the mount point",
      },
    },
    required: ["mountName"],
  },
};

export const READ_IMAGE_TOOL: Tool = {
  name: "read-image",
  description: "Read an image from a mounted directory",
  inputSchema: {
    type: "object",
    properties: {
      mountName: {
        type: "string",
        description: "Name of the mount point",
      },
      imagePath: {
        type: "string",
        description: "Path of the image file",
      },
    },
    required: ["mountName", "imagePath"],
  },
};
