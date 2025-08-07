import { Attributes } from '../core/document/attributes';
import { BuiltInAttributeKey } from '../core/legacy/built_in_attribute_keys';

export interface AttributesExtensions {
  heading: string | null;
  quote: boolean;
  number: number | null;
  check: boolean;
}

export function getAttributesHeading(attributes: Attributes): string | null {
  if (attributes[BuiltInAttributeKey.subtype] === BuiltInAttributeKey.heading &&
      attributes[BuiltInAttributeKey.heading] &&
      typeof attributes[BuiltInAttributeKey.heading] === 'string') {
    return attributes[BuiltInAttributeKey.heading] as string;
  }
  return null;
}

export function getAttributesQuote(attributes: Attributes): boolean {
  return attributes.hasOwnProperty(BuiltInAttributeKey.quote);
}

export function getAttributesNumber(attributes: Attributes): number | null {
  const numberValue = attributes[BuiltInAttributeKey.number];
  if (numberValue && typeof numberValue === 'number') {
    return numberValue;
  }
  return null;
}

export function getAttributesCheck(attributes: Attributes): boolean {
  const checkValue = attributes[BuiltInAttributeKey.checkbox];
  if (typeof checkValue === 'boolean') {
    return checkValue;
  }
  return false;
}

// Extend Attributes interface
declare module '../core/document/attributes' {
  interface Attributes extends AttributesExtensions {}
}