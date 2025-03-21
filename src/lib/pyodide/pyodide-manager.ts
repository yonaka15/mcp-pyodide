import { loadPyodide } from "pyodide";
import * as path from "path";
import * as fs from "fs";

import { withOutputCapture } from "../../utils/output-capture.js";
import {
  formatCallToolError,
  formatCallToolSuccess,
  contentFormatters,
} from "../../formatters/index.js";
import { MIME_TYPES } from "../../lib/mime-types/index.js";

import type { PyodideInterface } from "pyodide";

// Basic mount point configuration
interface MountConfig {
  hostPath: string;
  mountPoint: string;
}

interface ResourceInfo {
  name: string; // File name
  uri: string; // Full URI (file://....)
  mimeType: string; // MIME type
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
        jsglobals: {
          clearInterval,
          clearTimeout,
          setInterval,
          setTimeout,
          ImageData: {},
          document: {
            getElementById: (id: any) => {
              if (id.includes("canvas")) return null;
              else
                return {
                  addEventListener: () => {},
                  style: {},
                  classList: { add: () => {}, remove: () => {} },
                  setAttribute: () => {},
                  appendChild: () => {},
                  remove: () => {},
                };
            },
            createElement: () => ({
              addEventListener: () => {},
              style: {},
              classList: { add: () => {}, remove: () => {} },
              setAttribute: () => {},
              appendChild: () => {},
              remove: () => {},
            }),
            createTextNode: () => ({
              addEventListener: () => {},
              style: {},
              classList: { add: () => {}, remove: () => {} },
              setAttribute: () => {},
              appendChild: () => {},
              remove: () => {},
            }),
            body: {
              appendChild: () => {},
            },
          },
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
      return formatCallToolError("Pyodide not initialized");
    }

    try {
      const mountPoints = Array.from(this.mountPoints.entries()).map(
        ([name, config]) => ({
          name,
          hostPath: config.hostPath,
          mountPoint: config.mountPoint,
        })
      );
      return formatCallToolSuccess(JSON.stringify(mountPoints, null, 2));
    } catch (error) {
      return formatCallToolError(error);
    }
  }

  // List contents of a mounted directory
  async listMountedDirectory(mountName: string) {
    if (!this.pyodide) {
      return formatCallToolError("Pyodide not initialized");
    }

    const mountConfig = this.mountPoints.get(mountName);
    if (!mountConfig) {
      return formatCallToolError(`Mount point not found: ${mountName}`);
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
      return formatCallToolError(error);
    }
  }

  /**
   * Get mount name from file path
   * @param filePath Full path to check
   * @returns Mount name if found, null if not matched
   */
  getMountNameFromPath(filePath: string): string | null {
    if (!filePath) return null;

    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, "/");

    let longestMatch = "";
    let matchedMountName: string | null = null;

    // Check each mount point
    for (const [mountName, config] of this.mountPoints.entries()) {
      const normalizedHostPath = config.hostPath.replace(/\\/g, "/");

      // Check if path starts with this mount point
      if (normalizedPath.startsWith(normalizedHostPath)) {
        // Keep track of the longest matching path
        if (normalizedHostPath.length > longestMatch.length) {
          longestMatch = normalizedHostPath;
          matchedMountName = mountName;
        }
      }
    }

    return matchedMountName;
  }

  /**
   * Get mount point information from a file URI
   * @param uri File URI (e.g., "file:///mnt/data/file.txt")
   * @returns MountPathInfo object or null if not found
   */
  getMountPointInfo(uri: string) {
    // Remove "file://" prefix
    let filePath = uri.replace("file://", "");

    // Find matching mount point
    for (const [mountName, config] of this.mountPoints.entries()) {
      const mountPoint = config.mountPoint;

      // Check if path starts with this mount point
      if (filePath.startsWith(mountPoint)) {
        // Get relative path by removing mount point prefix
        const relativePath = filePath
          .slice(mountPoint.length)
          .replace(/^[/\\]+/, ""); // Remove leading slashes

        return {
          mountName,
          mountPoint,
          relativePath,
        };
      }
    }

    return null;
  }

  async executePython(code: string, timeout: number) {
    if (!this.pyodide) {
      return formatCallToolError("Pyodide not initialized");
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

      return formatCallToolSuccess(
        output
          ? `Output:\n${output}\nResult:\n${String(result)}`
          : String(result)
      );
    } catch (error) {
      return formatCallToolError(error);
    }
  }

  async installPackage(packageName: string) {
    if (!this.pyodide) {
      return formatCallToolError("Pyodide not initialized");
    }

    try {
      // パッケージ名をスペースで分割
      const packages = packageName.split(" ").map(pkg => pkg.trim()).filter(Boolean);
      
      if (packages.length === 0) {
        return formatCallToolError("No valid package names specified");
      }
      
      // 出力を収集
      const outputs: string[] = [];
      
      // 各パッケージをインストール
      for (const pkg of packages) {
        try {
          const { output } = await withOutputCapture(
            this.pyodide,
            async () => {
              await this.pyodide!.loadPackage(pkg, {
                messageCallback: (msg: string) => console.log(msg),
                errorCallback: (err: string) => console.error(err),
              });
            },
            { suppressConsole: true }
          );
          
          outputs.push(`Successfully installed ${pkg}:\n${output}`);
        } catch (error) {
          outputs.push(`Failed to install ${pkg}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      return formatCallToolSuccess(outputs.join("\n\n"));
    } catch (error) {
      return formatCallToolError(error);
    }
  }

  async readResource(
    mountName: string,
    resourcePath: string
  ): Promise<
    | {
        blob: string;
        mimeType: string;
      }
    | { error: string }
  > {
    if (!this.pyodide) {
      return { error: "Pyodide not initialized" };
    }

    const mountConfig = this.mountPoints.get(mountName);
    if (!mountConfig) {
      return { error: `Mount point not found: ${mountName}` };
    }

    try {
      // Get full path to the image
      const fullPath = path.join(mountConfig.hostPath, resourcePath);
      if (!fs.existsSync(fullPath)) {
        return { error: `Image file not found: ${fullPath}` };
      }

      // Get MIME type from file extension
      const ext = path.extname(fullPath).toLowerCase();
      const mimeType = MIME_TYPES[ext];
      if (!mimeType) {
        return { error: `Unsupported image format: ${ext}` };
      }

      // Read and encode image
      const imageBuffer = await fs.promises.readFile(fullPath);
      const base64Data = imageBuffer.toString("base64");

      return { blob: base64Data, mimeType };
    } catch (error) {
      return { error: String(error) };
    }
  }

  /**
   * List all files matching the given MIME types across all mount points
   * @param mimeTypes Array of MIME types to match (e.g., ['image/jpeg', 'image/png'])
   * @returns Array of ResourceInfo objects
   */
  async listResources(): Promise<ResourceInfo[]> {
    const resources: ResourceInfo[] = [];
    const validMimeTypes = new Set(Object.values(MIME_TYPES));

    const isMatchingMimeType = (filePath: string): string | null => {
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext];
      return mimeType && validMimeTypes.has(mimeType) ? mimeType : null;
    };

    const scanDirectory = (dirPath: string): void => {
      try {
        const items = fs.readdirSync(dirPath);
        const mountName = this.getMountNameFromPath(dirPath);
        if (!mountName) return;

        const config = this.mountPoints.get(mountName);
        if (!config) return;

        const { hostPath, mountPoint } = config;

        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            // Recursively scan subdirectories
            scanDirectory(fullPath);
          } else if (stat.isFile()) {
            // Check if file matches MIME type
            const mimeType = isMatchingMimeType(item);
            if (mimeType) {
              // Calculate relative path from hostPath
              const relativePath = path.relative(hostPath, fullPath);
              // Construct URI with full path
              const uri = `file://${path.join(mountPoint, relativePath)}`;

              resources.push({
                name: item,
                uri,
                mimeType,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dirPath}:`, error);
      }
    };

    // Scan all mount points
    for (const [_, config] of this.mountPoints.entries()) {
      scanDirectory(config.hostPath);
    }

    return resources;
  }

  async readImage(mountName: string, imagePath: string) {
    if (!this.pyodide) {
      return formatCallToolError("Pyodide not initialized");
    }
    try {
      const resource = await this.readResource(mountName, imagePath);
      if ("error" in resource) {
        return formatCallToolError(resource.error);
      }
      const content = contentFormatters.formatImage(
        resource.blob,
        resource.mimeType
      );
      return formatCallToolSuccess(content);
    } catch (error) {
      return formatCallToolError(error);
    }
  }
}

export { PyodideManager };
