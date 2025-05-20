
import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";

interface JsonEditorProps {
  initialValue: Record<string, any>;
  onChange?: (value: Record<string, any>) => void;
}

const JsonEditor: React.FC<JsonEditorProps> = ({ initialValue, onChange }) => {
  const [value, setValue] = useState(JSON.stringify(initialValue, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    try {
      const parsedJson = JSON.parse(newValue);
      setError(null);
      onChange?.(parsedJson);
    } catch (err) {
      setError("Invalid JSON");
    }
  };

  return (
    <div className="w-full">
      <Textarea 
        value={value}
        onChange={handleChange}
        className="font-mono text-sm"
        rows={5}
      />
      {error && (
        <p className="text-destructive text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default JsonEditor;
