import { loadPyodide } from "pyodide";

import { withOutputCapture } from "../../utils/output-capture.js";

import type { PyodideInterface } from "pyodide";

class PyodideManager {
  private static instance: PyodideManager | null = null;
  private pyodide: PyodideInterface | null = null;

  private constructor() {}

  static getInstance(): PyodideManager {
    if (!PyodideManager.instance) {
      PyodideManager.instance = new PyodideManager();
    }
    return PyodideManager.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      console.error("Initializing Pyodide...");
      this.pyodide = await loadPyodide({
        packageCacheDir: "pyodide-packages",
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
          return true;
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
