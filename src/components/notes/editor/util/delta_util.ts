// Delta utility extensions for text operations
export interface Attributes {
  [key: string]: any;
}

export interface TextInsert {
  insert: string;
  attributes?: Attributes;
}

export interface Delta {
  ops: Array<TextInsert | any>;
}

export class AttributesDelta {
  /**
   * Check if every text insert operation in the delta satisfies the given test function
   */
  static everyAttributes(delta: Delta, test: (attributes: Attributes) => boolean): boolean {
    const textInserts = delta.ops.filter((op): op is TextInsert => 
      typeof op === 'object' && 'insert' in op && typeof op.insert === 'string'
    );
    
    return textInserts.every((element) => {
      const attributes = element.attributes;
      return attributes != null && test(attributes);
    });
  }
}