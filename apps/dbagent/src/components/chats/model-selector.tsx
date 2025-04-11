import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@internal/components';
import { useEffect, useState } from 'react';
import { ProviderModel } from '~/lib/ai/providers/types';
import { actionGetLanguageModels } from './actions';

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function ModelSelector({ value, onValueChange }: ModelSelectorProps) {
  const [models, setModels] = useState<ProviderModel[]>([]);

  useEffect(() => {
    async function loadModels() {
      const models = await actionGetLanguageModels();
      setModels(models);
    }
    void loadModels();
  }, []);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
