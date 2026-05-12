import type { Tool } from "./types.ts";

// fetch content from a URL (docs, APIs, etc.)
const tool: Tool = {
  name: "web_fetch",
  description: "Fetch content from a URL (documentation, APIs, web pages)",
  parameters: {
    url: { type: "string", description: "Full URL to fetch", required: true },
  },
  async execute(args, _dryRun) {
    const url = args.url as string;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return `ERROR: Invalid URL "${url}"`;
    }

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        return `ERROR: HTTP ${response.status} ${response.statusText}`;
      }

      const text = await response.text();
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text") || contentType.includes("json") || contentType.includes("xml") || contentType.includes("html") || contentType.includes("markdown")) {
        return text.substring(0, 50_000);
      }

      return `Fetched ${url} (${text.length} bytes, content-type: ${contentType}) — binary content not shown`;
    } catch (err) {
      return `ERROR fetching ${url}: ${(err as Error).message}`;
    }
  },
};

export default tool;
