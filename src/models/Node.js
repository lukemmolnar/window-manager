/**
 * Node class representing a window or split in the window management system.
 * Forms the foundation of our tree-based window layout structure.
 */
export class Node {
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this.windowType = null;
    this.direction = null;
    this.first = null;
    this.second = null;
    this.splitRatio = 0.5;
    this.minimumSize = 20;
    this.state = null;
  }

  static createWindow(id, windowType, state = null) {
    const node = new Node(id, 'window');
    node.windowType = windowType;
    node.state = state;
    return node;
  }

  static createSplit(direction, first, second, ratio = 0.5) {
    const node = new Node(Date.now(), 'split');
    node.direction = direction;
    node.first = first;
    node.second = second;
    node.splitRatio = ratio;
    return node;
  }
}