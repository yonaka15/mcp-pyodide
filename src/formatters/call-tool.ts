import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type ContentItem = {
  [x: string]: unknown;
} & (
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      data: string;
      mimeType: string;
    }
  | {
      type: "resource";
      resource: {
        [x: string]: unknown;
        uri: string;
        text: string;
        mimeType?: string;
      };
    }
);

/**
 * Format text content
 * @param text Text to be formatted
 * @returns Formatted content item
 */
function formatText(text: string): ContentItem {
  return {
    type: "text",
    text: String(text),
  };
}

/**
 * Format image content
 * @param data Base64 encoded image data
 * @param mimeType Image MIME type
 * @returns Formatted content item
 */
function formatImage(data: string, mimeType: string): ContentItem {
  return {
    type: "image",
    data,
    mimeType,
  };
}

/**
 * Format resource
 * @param uri Resource URI
 * @param text Resource text content
 * @param mimeType Optional MIME type
 * @returns Formatted content item
 */
function formatResource(
  uri: string,
  text: string,
  mimeType?: string
): ContentItem {
  return {
    type: "resource",
    resource: {
      uri,
      text,
      mimeType,
    },
  };
}

/**
 * Format successful response
 * @param content Single content item or array of content items
 * @returns Formatted tool response
 */
export function formatSuccess(
  content: ContentItem | ContentItem[] | string
): CallToolResult {
  const contentArray = Array.isArray(content)
    ? content
    : typeof content === "string"
    ? [formatText(content)]
    : [content];

  return {
    content: contentArray,
    isError: false,
  };
}

/**
 * Format error response
 * @param error Error to be formatted
 * @returns Formatted tool response
 */
export function formatError(error: unknown): CallToolResult {
  return {
    content: [
      formatText(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      ),
    ],
    isError: true,
  };
}

// Export content formatters and types
export const contentFormatters = {
  formatText,
  formatImage,
  formatResource,
};

export type { ContentItem };
