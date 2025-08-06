import { Path, pathEquals } from '../document/path';

export class Position {
  public readonly path: Path;
  public readonly offset: number;

  constructor(options: {
    path: Path;
    offset?: number;
  }) {
    this.path = options.path;
    this.offset = options.offset || 0;
  }

  static invalid(): Position {
    return new Position({
      path: [-1],
      offset: -1,
    });
  }

  static fromJson(json: Record<string, any>): Position {
    const path = Array.from(json.path as number[]);
    const offset = json.offset || 0;

    return new Position({
      path,
      offset,
    });
  }

  equals(other: Position): boolean {
    return pathEquals(this.path, other.path) && this.offset === other.offset;
  }

  hashCode(): number {
    let hash = this.offset;
    for (const pathElement of this.path) {
      hash = (hash * 31 + pathElement) & 0xffffffff;
    }
    return hash;
  }

  toString(): string {
    return `path = ${JSON.stringify(this.path)}, offset = ${this.offset}`;
  }

  copyWith(options: {
    path?: Path;
    offset?: number;
  } = {}): Position {
    return new Position({
      path: options.path || this.path,
      offset: options.offset !== undefined ? options.offset : this.offset,
    });
  }

  toJson(): Record<string, any> {
    return {
      path: this.path,
      offset: this.offset,
    };
  }
}