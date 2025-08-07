// Search algorithm implementations for pattern matching
export interface Match {
  start: number;
  end: number;
  input: string;
  pattern: string;
  groupCount: number;
  group(index: number): string;
  groups(groups: number[]): string[];
}

export abstract class SearchAlgorithm {
  abstract searchMethod(pattern: string | RegExp, text: string): Match[];
}

export class BoyerMooreMatch implements Match {
  readonly start: number;
  readonly end: number;
  readonly input: string;
  readonly pattern: string;
  readonly groupCount = 0;

  constructor(pattern: string, input: string, start: number) {
    this.pattern = pattern;
    this.input = input;
    this.start = start;
    this.end = start + pattern.length;
  }

  group(index: number): string {
    if (index !== 0) {
      throw new RangeError(`Invalid group index: ${index}`);
    }
    return this.pattern;
  }

  groups(groups: number[]): string[] {
    return groups.map(g => this.group(g));
  }
}

export class BoyerMoore extends SearchAlgorithm {
  /**
   * Boyer-Moore algorithm for efficient pattern searching
   * More efficient than brute force as it can skip characters that will never match
   */
  searchMethod(pattern: string | RegExp, text: string): Match[] {
    if (typeof pattern === 'string') {
      return this._searchMethod(pattern, text);
    }
    throw new Error('RegExp patterns not implemented for Boyer-Moore');
  }

  private _searchMethod(pattern: string, text: string): Match[] {
    const m = pattern.length;
    const n = text.length;
    const badchar = new Map<string, number>();
    const matches: Match[] = [];

    this._badCharHeuristic(pattern, m, badchar);

    let s = 0;

    while (s <= (n - m)) {
      let j = m - 1;

      while (j >= 0 && pattern[j] === text[s + j]) {
        j--;
      }

      // If pattern is present at current shift, j becomes -1
      if (j < 0) {
        matches.push(new BoyerMooreMatch(pattern, text, s));
        s += (s + m < n) ? m - (badchar.get(text[s + m]) ?? -1) : 1;
      } else {
        s += Math.max(1, j - (badchar.get(text[s + j]) ?? -1));
      }
    }

    return matches;
  }

  private _badCharHeuristic(pattern: string, size: number, badchar: Map<string, number>): void {
    badchar.clear();

    // Fill the actual value of last occurrence of a character
    for (let i = 0; i < size; i++) {
      const ch = pattern[i];
      badchar.set(ch, i);
    }
  }
}

export class DartBuiltIn extends SearchAlgorithm {
  searchMethod(pattern: string | RegExp, text: string): Match[] {
    const matches: Match[] = [];
    
    if (typeof pattern === 'string') {
      let index = 0;
      while (index < text.length) {
        const found = text.indexOf(pattern, index);
        if (found === -1) break;
        
        matches.push(new BoyerMooreMatch(pattern, text, found));
        index = found + 1;
      }
    } else {
      // Handle RegExp
      const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          input: text,
          pattern: match[0],
          groupCount: match.length - 1,
          group: (index: number) => match[index] || '',
          groups: (groups: number[]) => groups.map(g => match[g] || '')
        });
      }
    }

    return matches;
  }
}