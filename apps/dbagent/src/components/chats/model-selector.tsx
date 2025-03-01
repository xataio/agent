import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@internal/components';

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function ModelSelector({ value, onValueChange }: ModelSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="openai-gpt-4o">GPT-4o</SelectItem>
        <SelectItem value="openai-gpt-4-turbo">GPT-4 Turbo</SelectItem>
        <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
        <SelectItem value="anthropic-claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</SelectItem>
      </SelectContent>
    </Select>
  );
}
