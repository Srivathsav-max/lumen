export type Path = number[];

export function pathEquals(a: Path, b: Path): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}

export function pathGreaterThanOrEqual(a: Path, b: Path): boolean {
  if (pathEquals(a, b)) {
    return true;
  }
  return pathGreaterThan(a, b);
}

export function pathGreaterThan(a: Path, b: Path): boolean {
  if (pathEquals(a, b)) {
    return false;
  }
  
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] < b[i]) {
      return false;
    } else if (a[i] > b[i]) {
      return true;
    }
  }
  
  if (a.length < b.length) {
    return false;
  }
  
  return true;
}

export function pathLessThanOrEqual(a: Path, b: Path): boolean {
  if (pathEquals(a, b)) {
    return true;
  }
  return pathLessThan(a, b);
}

export function pathLessThan(a: Path, b: Path): boolean {
  if (pathEquals(a, b)) {
    return false;
  }
  
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] > b[i]) {
      return false;
    } else if (a[i] < b[i]) {
      return true;
    }
  }
  
  if (a.length > b.length) {
    return false;
  }
  
  return true;
}

export function pathNext(path: Path): Path {
  const nextPath = [...path];
  if (nextPath.length === 0) {
    return nextPath;
  }
  
  const last = nextPath[nextPath.length - 1];
  nextPath[nextPath.length - 1] = last + 1;
  return nextPath;
}

export function pathNextN(path: Path, n: number): Path {
  const nextPath = [...path];
  if (nextPath.length === 0) {
    return nextPath;
  }
  
  const last = nextPath[nextPath.length - 1];
  nextPath[nextPath.length - 1] = last + n;
  return nextPath;
}

export function pathChild(path: Path, index: number): Path {
  return [...path, index];
}

export function pathPrevious(path: Path): Path {
  const previousPath = [...path];
  if (previousPath.length === 0) {
    return previousPath;
  }
  
  const last = previousPath[previousPath.length - 1];
  previousPath[previousPath.length - 1] = Math.max(0, last - 1);
  return previousPath;
}

export function pathPreviousN(path: Path, n: number): Path {
  const previousPath = [...path];
  if (previousPath.length === 0) {
    return previousPath;
  }
  
  const last = previousPath[previousPath.length - 1];
  previousPath[previousPath.length - 1] = Math.max(0, last - n);
  return previousPath;
}

export function pathParent(path: Path): Path {
  if (path.length === 0) {
    return path;
  }
  return path.slice(0, -1);
}

export function pathIsAncestorOf(ancestor: Path, descendant: Path): boolean {
  if (ancestor.length === 0) {
    return true;
  }
  
  if (descendant.length === 0) {
    return false;
  }
  
  if (ancestor.length >= descendant.length) {
    return false;
  }
  
  for (let i = 0; i < ancestor.length; i++) {
    if (ancestor[i] !== descendant[i]) {
      return false;
    }
  }
  
  return true;
}

// if isSameDepth is true, the path must be the same depth as the selection
export function pathInSelection(
  path: Path,
  selection: { start: { path: Path }, end: { path: Path } } | null,
  options: { isSameDepth?: boolean } = {}
): boolean {
  const { isSameDepth = false } = options;
  
  if (!selection) return false;
  
  // Normalize selection (ensure start <= end)
  const normalizedSelection = normalizeSelection(selection);
  
  const result = pathLessThanOrEqual(normalizedSelection.start.path, path) &&
                 pathLessThanOrEqual(path, normalizedSelection.end.path);
  
  if (isSameDepth) {
    return result && normalizedSelection.start.path.length === path.length;
  }
  
  return result;
}

function normalizeSelection(selection: { start: { path: Path }, end: { path: Path } }) {
  if (pathLessThanOrEqual(selection.start.path, selection.end.path)) {
    return selection;
  }
  
  return {
    start: selection.end,
    end: selection.start
  };
}