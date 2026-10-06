import { useOpenAiGlobal } from "./use-openai-global";

export function useWidgetProps<T extends Record<string, unknown>>(
  defaultState?: T | (() => T)
): T {
  const toolOutput = useOpenAiGlobal("toolOutput") as any;
  
  // Extract structuredContent from toolOutput
  // toolOutput can be:
  // 1. The full response object with structuredContent property
  // 2. The structuredContent itself (if OpenAI already extracted it)
  // 3. null/undefined if tool hasn't completed yet
  let props: T | undefined;
  
  if (toolOutput) {
    // Check if toolOutput has structuredContent property
    if (toolOutput.structuredContent) {
      props = toolOutput.structuredContent as T;
    } 
    // Check if toolOutput itself is the structuredContent (already extracted)
    else if (toolOutput.query !== undefined || toolOutput.results !== undefined || toolOutput.properties !== undefined || toolOutput.designs !== undefined || toolOutput.courses !== undefined || toolOutput.hotels !== undefined || toolOutput.flights !== undefined) {
      props = toolOutput as T;
    }
  }

  const fallback =
    typeof defaultState === "function"
      ? (defaultState as () => T)()
      : defaultState;

  return (props ?? fallback) as T;
}

