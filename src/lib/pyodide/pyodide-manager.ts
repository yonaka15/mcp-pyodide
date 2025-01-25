import { loadPyodide } from "pyodide";
import * as path from "path";
import * as fs from "fs";

import { withOutputCapture } from "../../utils/output-capture.js";

import type { PyodideInterface } from "pyodide";

// Basic mount point configuration
interface MountConfig {
  hostPath: string;
  mountPoint: string;
}

class PyodideManager {
  private static instance: PyodideManager | null = null;
  private pyodide: PyodideInterface | null = null;
  private mountPoints: Map<string, MountConfig> = new Map();

  private constructor() {}

  static getInstance(): PyodideManager {
    if (!PyodideManager.instance) {
      PyodideManager.instance = new PyodideManager();
    }
    return PyodideManager.instance;
  }

  async initialize(packageCacheDir: string): Promise<boolean> {
    try {
      console.error("Initializing Pyodide...");
      this.pyodide = await loadPyodide({
        packageCacheDir,
        stdout: (text: string) => {
          console.log("[Python stdout]:", text);
        },
        stderr: (text: string) => {
          console.error("[Python stderr]:", text);
        },
      });
      console.error("Pyodide initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize Pyodide:", error);
      return false;
    }
  }

  getPyodide(): PyodideInterface | null {
    return this.pyodide;
  }

  // Mount filesystem directories
  async mountDirectory(name: string, hostPath: string): Promise<boolean> {
    if (!this.pyodide) return false;

    try {
      const absolutePath = path.resolve(hostPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(absolutePath)) {
        fs.mkdirSync(absolutePath, { recursive: true });
        console.error(`Created directory: ${absolutePath}`);
      }

      const mountPoint = `/mnt/${name}`;
      this.pyodide.FS.mkdirTree(mountPoint);
      this.pyodide.FS.mount(
        this.pyodide.FS.filesystems.NODEFS,
        {
          root: absolutePath,
        },
        mountPoint
      );

      this.mountPoints.set(name, {
        hostPath: absolutePath,
        mountPoint,
      });

      return true;
    } catch (error) {
      console.error(`Failed to mount directory ${hostPath}:`, error);
      return false;
    }
  }

  // Get information about all mount points
  async getMountPoints() {
    if (!this.pyodide) {
      return {
        isError: true,
        content: [{ type: "text", text: "Pyodide not initialized" }],
      };
    }

    try {
      const mountPoints = Array.from(this.mountPoints.entries()).map(
        ([name, config]) => ({
          name,
          hostPath: config.hostPath,
          mountPoint: config.mountPoint,
        })
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(mountPoints, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error getting mount points: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }

  // List contents of a mounted directory
  async listMountedDirectory(mountName: string) {
    if (!this.pyodide) {
      return {
        isError: true,
        content: [{ type: "text", text: "Pyodide not initialized" }],
      };
    }

    const mountConfig = this.mountPoints.get(mountName);
    if (!mountConfig) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Mount point not found: ${mountName}`,
          },
        ],
      };
    }

    try {
      // Use Python code to get directory contents
      const pythonCode = `
import os

def list_directory(path):
    contents = []
    try:
        for item in os.listdir(path):
            full_path = os.path.join(path, item)
            if os.path.isfile(full_path):
                contents.append(f"FILE: {item}")
            elif os.path.isdir(full_path):
                contents.append(f"DIR: {item}")
    except Exception as e:
        print(f"Error listing directory: {e}")
        return []
    return contents

list_directory("${mountConfig.mountPoint}")
`;

      return await this.executePython(pythonCode, 5000);
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error listing directory: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }

  async executePython(code: string, timeout: number) {
    if (!this.pyodide) {
      return {
        isError: true,
        content: [{ type: "text", text: "Pyodide not initialized" }],
      };
    }

    try {
      const { result, output } = await withOutputCapture(
        this.pyodide,
        async () => {
          const executionResult = await Promise.race([
            this.pyodide!.runPythonAsync(code),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Execution timeout")), timeout)
            ),
          ]);

          // Memory cleanup
          this.pyodide!.globals.clear();
          await this.pyodide!.runPythonAsync("import gc; gc.collect()");

          return executionResult;
        },
        { suppressConsole: true }
      );

      return {
        content: [
          {
            type: "text",
            text: output
              ? `Output:\n${output}\nResult:\n${String(result)}`
              : String(result),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error executing Python code: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }

  async installPackage(packageName: string) {
    if (!this.pyodide) {
      return {
        isError: true,
        content: [{ type: "text", text: "Pyodide not initialized" }],
      };
    }

    try {
      const { output } = await withOutputCapture(
        this.pyodide,
        async () => {
          await this.pyodide!.loadPackage(packageName, {
            messageCallback: (msg: string) => console.log(msg),
            errorCallback: (err: string) => console.error(err),
          });
        },
        { suppressConsole: true }
      );

      return {
        content: [{ type: "text", text: output }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error installing package: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
}

export { PyodideManager };
