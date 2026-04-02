import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { executeTool } from '../tools/index.ts';

// Initialize Gemini API
// Make sure GEMINI_API_KEY is set in your environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const tools: FunctionDeclaration[] = [
  {
    name: 'shellExec',
    description: 'Execute a shell command in the terminal. Useful for running git commands, npm scripts, or system utilities.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, description: 'The shell command to run' }
      },
      required: ['command']
    }
  },
  {
    name: 'readFile',
    description: 'Read the contents of a file from the local file system.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'Absolute or relative path to the file' }
      },
      required: ['path']
    }
  },
  {
    name: 'writeFile',
    description: 'Write content to a file on the local file system. Will overwrite if the file exists.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'Path to the file' },
        content: { type: Type.STRING, description: 'Content to write to the file' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'webFetch',
    description: 'Fetch information from a URL on the web.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'The URL to fetch' }
      },
      required: ['url']
    }
  }
];

export async function runAgent(
  prompt: string, 
  history: any[], 
  onPermissionRequest: (tool: {name: string, args: any}) => Promise<boolean>
): Promise<string> {
  
  // Create a new chat session
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are an advanced, conversational coding agent running directly in the user's terminal.
You have access to the user's local file system and can execute shell commands.
Always explain what you are going to do before using a tool.
When writing code, be concise and use modern TypeScript/Node.js practices.`,
      tools: [{ functionDeclarations: tools }],
      temperature: 0.2
    }
  });

  // Send the user's message
  let response = await chat.sendMessage({ message: prompt });

  // Handle iterative tool calls
  while (response.functionCalls && response.functionCalls.length > 0) {
    const call = response.functionCalls[0];
    
    // Ask for user permission via callback
    const allowed = await onPermissionRequest({ name: call.name, args: call.args });
    
    let toolResult = '';
    if (allowed) {
      toolResult = await executeTool(call.name, call.args);
    } else {
      toolResult = 'User denied permission to run this tool. Ask the user how they would like to proceed.';
    }

    // Send the tool execution result back to the model
    response = await chat.sendMessage({
      message: [{
        functionResponse: {
          name: call.name,
          response: { result: toolResult }
        }
      }] as any
    });
  }

  return response.text || 'Task completed.';
}