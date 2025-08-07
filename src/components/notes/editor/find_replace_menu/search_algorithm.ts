/**
 * If someone wants to use their own implementation for the search algorithm
 * They can do so by extending this abstract class and overriding its
 * `searchMethod(Pattern pattern, String text)`, here `pattern` is the sequence of
 * characters that are to be searched within the `text`.
 */
export abstract class SearchAlgorithm {
  abstract searchMethod(pattern: string | RegExp, text: string): Match[];
}

export interface Match {
  start: number;
  end: number;
  input: string;
  pattern: string;
  groupCount: number;
  group(index: number): string;
  groups(indices: number[]): string[];
}

export class BoyerMooreMatch implements Match {
  start: number;
  input: string;
  pattern: string;
  end: number;
  groupCount: number = 0;

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

  groups(indices: number[]): string[] {
    return indices.map(index => this.group(index));
  }
}

export class BoyerMoore extends SearchAlgorithm {
  /**
   * This is a standard algorithm used for searching patterns in long text samples
   * It is more efficient than brute force searching because it is able to skip
   * characters that will never possibly match with required pattern.
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

      // If pattern is present at current shift, the index will become -1
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
    // (indices of table are characters and values are index of occurrence)
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
      // Simple string search
      let index = 0;
      while ((index = text.indexOf(pattern, index)) !== -1) {
        matches.push(new BoyerMooreMatch(pattern, text, index));
        index += pattern.length;
      }
    } else {
      // RegExp search
      const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      let match: RegExpExecArray | null;
      
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          input: text,
          pattern: match[0],
          groupCount: match.length - 1,
          group: (index: number) => {
            if (index < 0 || index >= match!.length) {
              throw new RangeError(`Invalid group index: ${index}`);
            }
            return match![index];
          },
          groups: (indices: number[]) => indices.map(i => match![i])
        });
        
        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    }
    
    return matches;
  }
}