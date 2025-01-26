import { Resource, ResourceContents } from "@modelcontextprotocol/sdk/types.js";
import { PyodideManager } from "../lib/pyodide/pyodide-manager.js";
import * as path from "path";

export class ResourceClient {
  constructor(private pyodideManager: PyodideManager) {}

  async listResources(): Promise<Resource[]> {
    const resources = await this.pyodideManager.listResources();
    return resources.map((resource) => {
      return {
        uri: resource.uri,
        name: resource.name,
        mimeType: resource.mimeType,
      };
    });
  }

  async readResource(uri: string): Promise<Resource> {
    const mountPointInfo = this.pyodideManager.getMountPointInfo(uri);

    if (!mountPointInfo) {
      throw new Error("Invalid URI");
    }

    // Get each value from pathInfo
    const { mountName, relativePath } = mountPointInfo;
    const result = await this.pyodideManager.readResource(
      mountName,
      relativePath
    );

    // Check for error
    if ("error" in result) {
      throw new Error(result.error);
    }

    // Get filename for the resource name
    const name = path.basename(relativePath);

    return {
      uri,
      name,
      blob: result.blob,
      mimeType: result.mimeType,
    };
  }
}
