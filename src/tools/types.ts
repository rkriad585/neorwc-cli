// parameter definition for a tool's argument
export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required?: boolean;
}

// a tool that the agent can invoke
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute(args: Record<string, unknown>, dryRun?: boolean): Promise<string>;
}

// parsed tool call from the AI's text output
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}
