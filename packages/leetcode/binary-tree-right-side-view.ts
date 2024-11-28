/**
 *
 * keep track of depth
 * keep track of x index
 *
 * actually I don't even need to keep track of x index
 *
 * because of bfs, we'll consume in order of x index
 * so just keep replacing arr[d] = v while at that depth
 * last value placed there will be the right most
 */

class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
    this.val = val === undefined ? 0 : val;
    this.left = left === undefined ? null : left;
    this.right = right === undefined ? null : right;
  }
}

function arrayToTree(arr: (number | null)[]): TreeNode | null {
  if (arr.length === 0 || arr[0] === null) {
    return null;
  }

  const root = new TreeNode(arr[0]);
  const queue: TreeNode[] = [root];
  let i = 1;

  while (queue.length > 0 && i < arr.length) {
    const node = queue.shift()!;

    // Left child
    if (i < arr.length && arr[i] !== null) {
      node.left = new TreeNode(arr[i]);
      queue.push(node.left);
    }
    i++;

    // Right child
    if (i < arr.length && arr[i] !== null) {
      node.right = new TreeNode(arr[i]);
      queue.push(node.right);
    }
    i++;
  }

  return root;
}

function main(root: TreeNode | null): number[] {
  if (!root) {
    return [];
  }
  const arr: number[] = [];
  const queue: { node: TreeNode; depth: number }[] = [{ node: root, depth: 0 }];
  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    arr[depth] = node.val;
    if (node.left !== null) {
      queue.push({ node: node.left, depth: depth + 1 });
    }
    if (node.right !== null) {
      queue.push({ node: node.right, depth: depth + 1 });
    }
  }
  return arr;
}

console.log(main(arrayToTree([1, 2, 3, null, 5, null, 4])));
