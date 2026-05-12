import type { Tool } from "./types.ts";
import readFilesTool from "./read_files.ts";
import writeFilesTool from "./write_files.ts";
import createFilesOrFoldersTool from "./create_files_or_folders.ts";
import editFilesTool from "./edit_files.ts";
import projectTreeTool from "./project_tree.ts";
import grepTool from "./grep.ts";
import searchTool from "./search.ts";
import webFetchTool from "./web_fetch.ts";

// all tools available to the agent
const tools: Tool[] = [
  readFilesTool,
  writeFilesTool,
  createFilesOrFoldersTool,
  editFilesTool,
  projectTreeTool,
  grepTool,
  searchTool,
  webFetchTool,
];

export default tools;

// build the tool descriptions section for the system prompt
export function buildToolDescriptions(): string {
  return tools
    .map((t) => {
      const params = Object.entries(t.parameters)
        .map(([key, p]) => `  - ${key} (${p.type})${p.required ? " *required*" : ""}: ${p.description}`)
        .join("\n");
      return `${t.name}: ${t.description}\n${params}`;
    })
    .join("\n\n");
}

// find a tool by name
export function findTool(name: string): Tool | undefined {
  return tools.find((t) => t.name === name);
}
