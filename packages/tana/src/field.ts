export const FIELD_TYPES = [
  'boolean',
  'date',
  'node-reference',
  'number',
  'select',
  'text',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export type FieldDefinition = Readonly<{
  defaultValue?: FieldValue;
  id: string;
  label: string;
  options?: readonly string[];
  type: FieldType;
}>;

export type FieldValue = boolean | null | number | string | readonly string[];

export type FieldValues = Readonly<Record<string, FieldValue>>;

export const normalizeFieldValue = (
  definition: FieldDefinition,
  value: unknown
): FieldValue => {
  if (value === null) return null;
  switch (definition.type) {
    case 'boolean': {
      return Boolean(value);
    }
    case 'number': {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    }
    case 'node-reference': {
      return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : typeof value === 'string'
          ? [value]
          : [];
    }
    default: {
      return String(value ?? '');
    }
  }
};
