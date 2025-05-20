
import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";

interface JsonEditorProps<T> {
  initialValue: T;
  onChange?: (value: T) => void;
}

const JsonEditor = <T,>({ initialValue, onChange }: JsonEditorProps<T>) => {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    try {
      const parsedJson = JSON.parse(newValue);
      setError(null);
      onChange?.(parsedJson);
      setValue(null);
    } catch (err) {
      setValue(newValue);
      setError("Invalid JSON");
    }
  };

  return (
    <div className="w-full">
      <Textarea
        value={value ?? JSON.stringify(initialValue, null, 2)}
        onChange={handleChange}
        className="font-mono text-sm"
        rows={5}
      />
      {error && <p className="text-destructive text-sm mt-1">{error}</p>}
    </div>
  );
};

export default JsonEditor;
