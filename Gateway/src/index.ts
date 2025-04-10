import express from "express";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
// import { services } from "./utils/endpoints";
import cors from "cors";
// import { limiter } from "./utils/RateLimiter";
const app = express();
const PORT = 3001;
const pdfService =  "http://pdf-service:3002";
const chatService = "http://chat-service:3003";

const corsOptions = {
  origin: "http://localhost:3000", // Maps to the host machine's localhost
  credentials: true, // Allow credentials (cookies, etc.) to be sent
};

// CORS middleware for all requests
app.use(cors(corsOptions));

// Handle preflight for all relevant routes
app.options("/api/pdfprocessor/chat", cors(corsOptions));
app.options("/api/chatprocessor/llm", cors(corsOptions));

  
  // app.options("*", cors(corsOptions)); // handle preflight

  // app.use(cors());
  // app.use(cookieParser());
  
  // app.use(limiter)
app.use((req, res, next) => {
  console.log("🔍 Incoming request path:", req.path);
  next();
});

  
app.use(
    "/api/pdfprocessor",
    createProxyMiddleware({
      target: pdfService,
      changeOrigin: true,
      pathRewrite: (path, req) => {
        console.log("📦 Rewriting path:", path);
        // Return the path unchanged if no rewriting is required:
        return path;
      }
      
    })
  );
  

  app.use(
    "/api/chatprocessor",
    createProxyMiddleware({
      target: chatService,
      changeOrigin: true,
      pathRewrite: (path, req) => path,
      // ✅ This fixes the type error
      onProxyRes: (proxyRes: any) => {
        proxyRes.headers["Access-Control-Allow-Origin"] = corsOptions.origin;
        proxyRes.headers["Access-Control-Allow-Credentials"] = "true";
      },
    } as Options)
  );
  


app.listen(PORT, () => {
  console.log(`API Gateway running at http://localhost:${PORT}`);
  console.log(`PDF Service Proxy: ${pdfService}`);
  console.log(`Chat Service Proxy: ${chatService}`);
});
