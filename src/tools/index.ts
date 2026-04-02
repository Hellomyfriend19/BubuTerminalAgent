import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync } from 'fs';

const execAsync = promisify(exec);

export async function executeTool(name: string, args: any): Promise<string> {
  try {
    switch (name) {
      case 'shellExec':
        const { stdout, stderr } = await execAsync(args.command);
        return stdout || stderr || 'Command executed successfully with no output.';
      
      case 'readFile':
        return readFileSync(args.path, 'utf-8');
      
      case 'writeFile':
        writeFileSync(args.path, args.content, 'utf-8');
        return `Successfully wrote to ${args.path}`;
        
      case 'webFetch':
        const response = await fetch(args.url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        // Truncate if too long to prevent token overflow
        return text.slice(0, 10000);
        
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error: any) {
    return `Error executing ${name}: ${error.message}`;
  }
}