
import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Validator } from "convex/values";
import { validate, ValidationError } from "convex-helpers/validators";

const JsonEditor = <T,>({
  initialValue,
  onChange,
  validator,
}: {
  initialValue: T;
  onChange?: (value: T) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validator: Validator<T, "required", any>;
}) => {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    try {
      const parsedJson = JSON.parse(newValue);
      validate(validator, parsedJson, { throw: true });
      setError(null);
      onChange?.(parsedJson);
      setValue(null);
    } catch (err) {
      setValue(newValue);
      if (err instanceof ValidationError) {
        setError(err.message);
      } else {
        setError("Invalid JSON");
      }
    }
  };

  return (
    <div className="w-full">
      <Textarea
        value={value ?? JSON.stringify(initialValue, null, 2)}
        onChange={handleChange}
        className="font-mono text-sm h-72"
        rows={5}
      />
      {error && <p className="text-destructive text-sm mt-1">{error}</p>}
    </div>
  );
};

export default JsonEditor;
