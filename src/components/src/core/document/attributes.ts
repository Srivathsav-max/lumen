/// Attributes is used to describe the Node's information.
///
/// Please note: The keywords in [BuiltInAttributeKey] are reserved.
export type Attributes = Record<string, any>;

export function isAttributesEqual(a?: Attributes, b?: Attributes): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => a[key] === b[key]);
}

export function composeAttributes(
  base?: Attributes,
  other?: Attributes,
  options: { keepNull?: boolean } = {}
): Attributes | null {
  const { keepNull = false } = options;
  
  base = base || {};
  other = other || {};
  
  let attributes: Attributes = {
    ...base,
    ...other,
  };

  if (!keepNull) {
    attributes = Object.fromEntries(
      Object.entries(attributes).filter(([_, value]) => value != null)
    );
  }

  return Object.keys(attributes).length > 0 ? attributes : null;
}

export function invertAttributes(from?: Attributes, to?: Attributes): Attributes {
  from = from || {};
  to = to || {};
  const attributes: Attributes = {};

  // key in from but not in to, or value is different
  for (const [key, value] of Object.entries(from)) {
    if ((!to.hasOwnProperty(key) && value != null) || to[key] !== value) {
      attributes[key] = value;
    }
  }

  // key in to but not in from, or value is different
  for (const [key, value] of Object.entries(to)) {
    if (!from.hasOwnProperty(key) && value != null) {
      attributes[key] = null;
    }
  }

  return attributes;
}

export function diffAttributes(
  from?: Record<string, any>,
  to?: Record<string, any>
): Attributes | null {
  from = from || {};
  to = to || {};
  const attributes: Attributes = {};

  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);
  
  for (const key of allKeys) {
    if (from[key] !== to[key]) {
      attributes[key] = to.hasOwnProperty(key) ? to[key] : null;
    }
  }

  return attributes;
}

export function hashAttributes(base: Attributes): number {
  let hash = 0;
  for (const [key, value] of Object.entries(base)) {
    const entryHash = hashString(key) ^ hashValue(value);
    hash = (hash + entryHash) & 0xffffffff;
  }
  return hash;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

function hashValue(value: any): number {
  if (value == null) return 0;
  if (typeof value === 'string') return hashString(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return hashString(JSON.stringify(value));
}