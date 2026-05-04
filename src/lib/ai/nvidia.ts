import OpenAI from "openai";

export const nvidiaClient = new OpenAI({
  baseURL: process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY!,
});

export const NVIDIA_MODEL = process.env.NVIDIA_MODEL ?? "z-ai/glm-5.1";
export const NVIDIA_PROMPT_VERSION = "v1.0";
