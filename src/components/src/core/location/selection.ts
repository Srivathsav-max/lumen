import { Path, pathEquals, pathGreaterThan, pathLessThan, pathPreviousN, pathNextN } from '../document/path';
import { Position } from './position';

/// Selection represents the selected area or the cursor area in the editor.
///
/// [Selection] is directional.
///
/// 1. forward，the end position is before the start position.
/// 2. backward, the end position is after the start position.
/// 3. collapsed, the end position is equal to the start position.
export class Selection {
  public readonly start: Position;
  public readonly end: Position;

  /// Create a selection with [start], [end].
  constructor(options: {
    start: Position;
    end: Position;
  }) {
    this.start = options.start;
    this.end = options.end;
  }

  static fromJson(json: Record<string, any>): Selection {
    return new Selection({
      start: Position.fromJson(json.start),
      end: Position.fromJson(json.end),
    });
  }

  /// Create a selection with [Path], [startOffset] and [endOffset].
  ///
  /// The [endOffset] is optional.
  ///
  /// This constructor will return a collapsed [Selection] if [endOffset] is null.
  static single(options: {
    path: Path;
    startOffset: number;
    endOffset?: number;
  }): Selection {
    const { path, startOffset, endOffset } = options;
    return new Selection({
      start: new Position({ path, offset: startOffset }),
      end: new Position({ path, offset: endOffset ?? startOffset }),
    });
  }

  /// Create a collapsed selection with [position].
  static collapsed(position: Position): Selection {
    return new Selection({
      start: position,
      end: position,
    });
  }

  /// Create a collapsed selection with [position].
  /// @deprecated use Selection.collapsed() instead
  static collapse(path: Path, offset: number): Selection {
    const position = new Position({ path, offset });
    return new Selection({
      start: position,
      end: position,
    });
  }

  static invalid(): Selection {
    const invalidPosition = Position.invalid();
    return new Selection({
      start: invalidPosition,
      end: invalidPosition,
    });
  }

  equals(other: Selection): boolean {
    return this.start.equals(other.start) && this.end.equals(other.end);
  }

  hashCode(): number {
    return this.start.hashCode() ^ this.end.hashCode();
  }

  toString(): string {
    return `start = ${this.start.toString()}, end = ${this.end.toString()}`;
  }

  /// Returns a Boolean indicating whether the selection's start and end points
  /// are at the same position.
  get isCollapsed(): boolean {
    return this.start.equals(this.end);
  }

  /// Returns a Boolean indicating whether the selection's start and end points
  /// are at the same path.
  get isSingle(): boolean {
    return pathEquals(this.start.path, this.end.path);
  }

  /// Returns a Boolean indicating whether the selection is forward.
  get isForward(): boolean {
    return pathGreaterThan(this.start.path, this.end.path) || 
           (this.isSingle && this.start.offset > this.end.offset);
  }

  /// Returns a Boolean indicating whether the selection is backward.
  get isBackward(): boolean {
    return pathLessThan(this.start.path, this.end.path) || 
           (this.isSingle && this.start.offset < this.end.offset);
  }

  /// Returns a normalized selection that direction is forward.
  get normalized(): Selection {
    return this.isBackward ? this.copyWith() : this.reversed.copyWith();
  }

  /// Returns a reversed selection.
  get reversed(): Selection {
    return this.copyWith({
      start: this.end,
      end: this.start,
    });
  }

  /// Returns the offset in the starting position under the normalized selection.
  get startIndex(): number {
    return this.normalized.start.offset;
  }

  /// Returns the offset in the ending position under the normalized selection.
  get endIndex(): number {
    return this.normalized.end.offset;
  }

  get length(): number {
    return this.endIndex - this.startIndex;
  }

  /// Collapses the current selection to a single point.
  ///
  /// If [atStart] is true, the selection will be collapsed to the start point.
  /// If [atStart] is false, the selection will be collapsed to the end point.
  collapse(options: { atStart?: boolean } = {}): Selection {
    const { atStart = false } = options;
    
    if (atStart) {
      return this.copyWith({ end: this.start });
    } else {
      return this.copyWith({ start: this.end });
    }
  }

  copyWith(options: {
    start?: Position;
    end?: Position;
  } = {}): Selection {
    return new Selection({
      start: options.start || this.start,
      end: options.end || this.end,
    });
  }

  toJson(): Record<string, any> {
    return {
      start: this.start.toJson(),
      end: this.end.toJson(),
    };
  }

  shift(offset: number): Selection {
    return this.copyWith({
      start: this.start.copyWith({ offset: this.start.offset + offset }),
      end: this.end.copyWith({ offset: this.end.offset + offset }),
    });
  }
}