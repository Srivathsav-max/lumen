import { Document } from './document';
import { Node } from './node';
import { Operation, InsertOperation, DeleteOperation, UpdateOperation } from '../transform/operation';
import { isAttributesEqual } from './attributes';

export function diffDocuments(oldDocument: Document, newDocument: Document): Operation[] {
  return diffNodes(oldDocument.root, newDocument.root);
}

export function diffNodes(oldNode: Node, newNode: Node): Operation[] {
  const operations: Operation[] = [];

  if (!isAttributesEqual(oldNode.attributes, newNode.attributes)) {
    operations.push(
      new UpdateOperation(oldNode.path, newNode.attributes, oldNode.attributes)
    );
  }

  const oldChildrenById = new Map<string, Node>();
  for (const child of oldNode.children) {
    oldChildrenById.set(child.id, child);
  }

  const newChildrenById = new Map<string, Node>();
  for (const child of newNode.children) {
    newChildrenById.set(child.id, child);
  }

  // Identify insertions and updates
  for (const newChild of newNode.children) {
    const oldChild = oldChildrenById.get(newChild.id);
    if (!oldChild) {
      // Insert operation
      operations.push(new InsertOperation(newChild.path, [newChild]));
    } else {
      // Recursive diff for updates
      operations.push(...diffNodes(oldChild, newChild));
    }
  }

  // Identify deletions
  for (const [id, oldChild] of oldChildrenById) {
    if (!newChildrenById.has(id)) {
      operations.push(new DeleteOperation(oldChild.path, [oldChild]));
    }
  }

  // Combine the operation in operations

  // 1. Insert operations can be combined if they are continuous
  const combinedOperations: Operation[] = [];
  if (operations.length > 0 && operations.every(op => op instanceof InsertOperation)) {
    operations.sort((a, b) => a.path <= b.path ? -1 : 1);
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (combinedOperations.length === 0) {
        combinedOperations.push(op);
      } else {
        const prevOp = operations[i - 1];
        if (pathEquals(op.path, nextPath(prevOp.path))) {
          const lastOp = combinedOperations.pop()! as InsertOperation;
          combinedOperations.push(
            new InsertOperation(
              lastOp.path,
              [...lastOp.nodes, ...(op as InsertOperation).nodes]
            )
          );
        } else {
          combinedOperations.push(op);
        }
      }
    }
    return combinedOperations;
  }

  // 2. Delete operations can be combined if they are continuous
  if (operations.length > 0 && operations.every(op => op instanceof DeleteOperation)) {
    operations.sort((a, b) => a.path <= b.path ? -1 : 1);
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (combinedOperations.length === 0) {
        combinedOperations.push(op);
      } else {
        const prevOp = operations[i - 1];
        if (pathEquals(op.path, nextPath(prevOp.path))) {
          const lastOp = combinedOperations.pop()! as DeleteOperation;
          combinedOperations.push(
            new DeleteOperation(
              lastOp.path,
              [...lastOp.nodes, ...(op as DeleteOperation).nodes]
            )
          );
        } else {
          combinedOperations.push(op);
        }
      }
    }
    return combinedOperations;
  }

  return operations;
}

// Helper functions for path operations
function pathEquals(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}

function nextPath(path: number[]): number[] {
  if (path.length === 0) return path;
  const result = [...path];
  result[result.length - 1] += 1;
  return result;
}