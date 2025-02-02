import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import bodyParser from "body-parser";
import cors from "cors";

function getClientIp(req: Request): string {
  return (
    req.get("x-forwarded-for")?.split(",")[0] ||
    req.get("x-real-ip") ||
    req.ip ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

export async function runSSEServer(server: Server) {
  let sseTransport: SSEServerTransport | null = null;
  const app = express();

  // Enable CORS
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
    })
  );

  // Used to allow parsing of the body of the request
  app.use(bodyParser.json());

  app.get("/sse", async (req, res) => {
    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    sseTransport = new SSEServerTransport("/messages", res);
    await server.connect(sseTransport);

    // Send initial connection message
    res.write('data: {"type":"connection_established"}\n\n');

    res.on("close", () => {
      console.log("Client disconnected");
      sseTransport = null;
    });
  });

  app.post("/messages", async (req: Request, res) => {
    if (sseTransport) {
      try {
        // Parse the body and add the IP address
        const body = req.body;
        const params = req.body.params || {};
        params._meta = {
          ip: getClientIp(req),
          headers: req.headers,
        };
        const enrichedBody = {
          ...body,
          params,
        };

        await sseTransport.handlePostMessage(req, res, enrichedBody);
      } catch (error) {
        console.error("Error handling message:", error);
        res.status(500).json({
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } else {
      res.status(400).json({
        error: "No Connection",
        message: "No active SSE connection",
      });
    }
  });

  // Handle 404s for all other routes
  app.use((req, res) => {
    res.status(404).json({
      error: "Not Found",
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    });
  });

  const port = 3020;
  app.listen(port, () => {
    console.error(
      `pyodide MCP Server running on SSE at http://localhost:${port}`
    );
  });
}
