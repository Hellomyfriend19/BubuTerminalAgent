import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { runAgent } from '../agent/gemini.ts';

interface Message {
  role: 'user' | 'agent' | 'error' | 'system';
  text: string;
}

export default function App() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Message[]>([
    { role: 'system', text: 'Agent initialized. How can I help you today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTool, setPendingTool] = useState<{name: string, args: any, resolve: (allow: boolean) => void} | null>(null);

  useInput((char, key) => {
    if (pendingTool) {
      if (char.toLowerCase() === 'y') {
        pendingTool.resolve(true);
        setPendingTool(null);
      } else if (char.toLowerCase() === 'n') {
        pendingTool.resolve(false);
        setPendingTool(null);
      }
    }
  });

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || pendingTool) return;
    
    const userMsg = input;
    setInput('');
    setHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await runAgent(userMsg, history, (toolCall) => {
        return new Promise((resolve) => {
          // Auto-approve safe tools, prompt for others
          if (['readFile', 'webFetch'].includes(toolCall.name)) {
             resolve(true);
          } else {
             setPendingTool({ ...toolCall, resolve });
          }
        });
      });
      
      setHistory(prev => [...prev, { role: 'agent', text: response }]);
    } catch (err: any) {
      setHistory(prev => [...prev, { role: 'error', text: err.message || String(err) }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" padding={1} flexDirection="column">
        <Text color="cyan" bold>BubuTerminal AI Agent</Text>
        <Text color="gray">Powered by Bun, Ink, and Gemini 3.0 Flash With ability to write files ;)</Text>
      </Box>

      <Box flexDirection="column" marginY={1}>
        {history.map((msg, i) => (
          <Box key={i} flexDirection="row" marginBottom={msg.role === 'agent' ? 1 : 0}>
            <Box width={3} flexShrink={0}>
              <Text color={
                msg.role === 'user' ? 'green' : 
                msg.role === 'error' ? 'red' : 
                msg.role === 'system' ? 'magenta' : 'blue'
              } bold>
                {msg.role === 'user' ? '❯ ' : 
                 msg.role === 'error' ? '✖ ' : 
                 msg.role === 'system' ? 'ℹ ' : '🤖 '}
              </Text>
            </Box>
            <Box flexGrow={1}>
              <Text>{msg.text}</Text>
            </Box>
          </Box>
        ))}
      </Box>

      {isLoading && !pendingTool && (
        <Box marginY={1}>
          <Text color="yellow"><Spinner type="dots" /> Agent is thinking...</Text>
        </Box>
      )}

      {pendingTool && (
        <Box borderStyle="single" borderColor="yellow" padding={1} flexDirection="column" marginY={1}>
          <Text color="yellow" bold>⚠️ Permission Required</Text>
          <Text>The agent wants to execute: <Text bold color="white">{pendingTool.name}</Text></Text>
          <Box marginY={1} paddingLeft={2}>
            <Text color="gray">{JSON.stringify(pendingTool.args, null, 2)}</Text>
          </Box>
          <Text>Allow execution? (<Text color="green" bold>y</Text>/<Text color="red" bold>n</Text>)</Text>
        </Box>
      )}

      {!isLoading && !pendingTool && (
        <Box>
          <Box width={3} flexShrink={0}>
            <Text color="green" bold>❯ </Text>
          </Box>
          <Box flexGrow={1}>
            <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} placeholder="Type a command..." />
          </Box>
        </Box>
      )}
    </Box>
  );
}