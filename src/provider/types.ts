export interface ModelCapabilities {
  maxContext: number;
  exists: boolean;
}

export interface GeneratePayload {
  model: string;
  prompt: string;
  options: {
    num_ctx: number;
    temperature: number;
  };
}

export interface AiProvider {
  name: string;
  getCapabilities(modelName: string): Promise<ModelCapabilities>;
  generate(payload: GeneratePayload): Promise<string>;
}
