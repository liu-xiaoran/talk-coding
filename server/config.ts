import 'dotenv/config';

const DEFAULT_TOOL_VALUES = ['claude', 'codex', 'gemini'] as const;
type DefaultTool = (typeof DEFAULT_TOOL_VALUES)[number];

function parseDefaultTool(value: string | undefined): DefaultTool {
  if (value && DEFAULT_TOOL_VALUES.includes(value as DefaultTool)) {
    return value as DefaultTool;
  }
  return 'claude';
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  defaultTool: parseDefaultTool(process.env.DEFAULT_TOOL),
  projectsDir: process.env.PROJECTS_DIR || 'projects',
} as const;
