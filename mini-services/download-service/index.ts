// Download Service - Port 3005
import { serve } from "bun";

const PORT = 3005;
const ZIP_PATH = "/home/z/tarifa-store.zip";

serve({
  port: PORT,
  fetch(request) {
    const url = new URL(request.url);
    
    // CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (url.pathname === "/" || url.pathname === "/tarifa-store.zip") {
      const file = Bun.file(ZIP_PATH);
      if (file.exists()) {
        return new Response(file, {
          headers: {
            ...headers,
            "Content-Type": "application/zip",
            "Content-Disposition": "attachment; filename=tarifa-store.zip",
            "Content-Length": file.size.toString(),
          },
        });
      }
      return new Response("File not found", { status: 404, headers });
    }

    return new Response("Download Service Ready. Use /tarifa-store.zip to download.", { headers });
  },
});

console.log(`Download service running on port ${PORT}`);
console.log(`Download URL: /tarifa-store.zip?XTransformPort=${PORT}`);
