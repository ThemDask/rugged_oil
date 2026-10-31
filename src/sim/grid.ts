import { UNITS_PER_TILE, idiv, type Vec } from './math';

const STRAIGHT_COST = 10;
const DIAGONAL_COST = 14;
const NEIGHBOURS: readonly Vec[] = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
];

export interface TileRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Tile containing a sim position. */
export function cellOf(position: Vec): Vec {
    return { x: Math.floor(position.x / UNITS_PER_TILE), y: Math.floor(position.y / UNITS_PER_TILE) };
}

/** Sim position of a tile's center. */
export function cellCenter(cell: Vec): Vec {
    const half = UNITS_PER_TILE / 2;
    return { x: cell.x * UNITS_PER_TILE + half, y: cell.y * UNITS_PER_TILE + half };
}

/** Clearance a unit needs to fit on a tile, from its half-size in sim units (radius or half its width). */
export function clearanceFor(radius: number): number {
    return Math.max(1, idiv(radius + UNITS_PER_TILE - 1, UNITS_PER_TILE));
}

/**
 * The map as a tile grid: blocked tiles, the free space around each tile (clearance), and A*
 * pathfinding that only uses tiles with enough room for a unit's size.
 */
export class SimGrid {
    readonly width: number;
    readonly height: number;
    private readonly blocked: Uint8Array;
    /** Chebyshev distance to the nearest blocked tile or map edge. 0 = blocked. */
    private readonly clearanceMap: Int32Array;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.blocked = new Uint8Array(width * height);
        this.clearanceMap = new Int32Array(width * height);
        this.updateClearance();
    }

    isInside(c: Vec): boolean {
        return c.x >= 0 && c.y >= 0 && c.x < this.width && c.y < this.height;
    }

    isBlocked(c: Vec): boolean {
        return !this.isInside(c) || this.blocked[this.index(c)] === 1;
    }

    clearance(c: Vec): number {
        return this.isInside(c) ? this.clearanceMap[this.index(c)] : 0;
    }

    isPassable(c: Vec, minClearance: number): boolean {
        return this.clearance(c) >= minClearance;
    }

    blockRect(rect: TileRect): void {
        for (let y = rect.y; y < rect.y + rect.h; y++) {
            for (let x = rect.x; x < rect.x + rect.w; x++) {
                if (this.isInside({ x, y })) this.blocked[this.index({ x, y })] = 1;
            }
        }
    }

    /** Recomputes clearance. Call after the last blockRect(). */
    updateClearance(): void {
        const { width, height } = this;
        this.clearanceMap.fill(-1);
        // Breadth-first fill outward. The queue must hold all distance-0 tiles (blocked) before
        // the distance-1 tiles (map edge), so distances only ever grow along the queue.
        const queue: Vec[] = [];
        const edges: Vec[] = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                if (this.blocked[i] === 1) {
                    this.clearanceMap[i] = 0;
                    queue.push({ x, y });
                } else if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                    this.clearanceMap[i] = 1;
                    edges.push({ x, y });
                }
            }
        }
        queue.push(...edges);
        for (let head = 0; head < queue.length; head++) {
            const cell = queue[head];
            for (const d of NEIGHBOURS) {
                const next = { x: cell.x + d.x, y: cell.y + d.y };
                if (this.isInside(next) && this.clearanceMap[this.index(next)] === -1) {
                    this.clearanceMap[this.index(next)] = this.clearanceMap[this.index(cell)] + 1;
                    queue.push(next);
                }
            }
        }
    }

    /** The closest tile to `cell` with enough clearance, searching outward ring by ring. */
    nearestPassable(cell: Vec, minClearance: number): Vec {
        if (this.isPassable(cell, minClearance)) return cell;
        const maxRing = Math.max(this.width, this.height);
        for (let ring = 1; ring < maxRing; ring++) {
            for (let y = cell.y - ring; y <= cell.y + ring; y++) {
                for (let x = cell.x - ring; x <= cell.x + ring; x++) {
                    const onRing = Math.abs(x - cell.x) === ring || Math.abs(y - cell.y) === ring;
                    if (onRing && this.isPassable({ x, y }, minClearance)) return { x, y };
                }
            }
        }
        return cell;
    }

    /**
     * Tiles from `start` (excluded) to the passable tile nearest `goal` (included). Empty if
     * already there or unreachable. 8-directional, never cuts past blocked corners.
     */
    findPath(start: Vec, goalIn: Vec, minClearance: number): Vec[] {
        if (!this.isInside(start)) return [];
        const goal = this.nearestPassable(goalIn, minClearance);
        if (goal.x === start.x && goal.y === start.y) return [];

        const count = this.width * this.height;
        const cost = new Int32Array(count).fill(-1);
        const cameFrom = new Int32Array(count).fill(-1);
        const closed = new Uint8Array(count);
        // Heap entries encode (estimated total cost, tile index) in one number: ties break by index.
        const open: number[] = [];
        const startIndex = this.index(start);
        const goalIndex = this.index(goal);
        cost[startIndex] = 0;
        heapPush(open, heuristic(start, goal) * count + startIndex);

        while (open.length > 0) {
            const current = heapPop(open) % count;
            if (current === goalIndex) break;
            if (closed[current] === 1) continue;
            closed[current] = 1;
            const cell = { x: current % this.width, y: idiv(current, this.width) };
            for (const d of NEIGHBOURS) {
                const next = { x: cell.x + d.x, y: cell.y + d.y };
                if (!this.isPassable(next, minClearance)) continue;
                const diagonal = d.x !== 0 && d.y !== 0;
                if (diagonal && !(this.isPassable({ x: next.x, y: cell.y }, minClearance) && this.isPassable({ x: cell.x, y: next.y }, minClearance))) {
                    continue;
                }
                const nextIndex = this.index(next);
                if (closed[nextIndex] === 1) continue;
                const newCost = cost[current] + (diagonal ? DIAGONAL_COST : STRAIGHT_COST);
                if (cost[nextIndex] === -1 || newCost < cost[nextIndex]) {
                    cost[nextIndex] = newCost;
                    cameFrom[nextIndex] = current;
                    heapPush(open, (newCost + heuristic(next, goal)) * count + nextIndex);
                }
            }
        }

        if (cameFrom[goalIndex] === -1) return [];
        const path: Vec[] = [];
        for (let i = goalIndex; i !== startIndex; i = cameFrom[i]) {
            path.push({ x: i % this.width, y: idiv(i, this.width) });
        }
        return path.reverse();
    }

    /** Drops path tiles that can be skipped with a straight, clear line, leaving the corners. */
    smooth(start: Vec, path: Vec[], minClearance: number): Vec[] {
        const result: Vec[] = [];
        let anchor = start;
        let i = 0;
        while (i < path.length) {
            let farthest = i;
            for (let j = i + 1; j < path.length; j++) {
                if (!this.hasLine(anchor, path[j], minClearance)) break;
                farthest = j;
            }
            result.push(path[farthest]);
            anchor = path[farthest];
            i = farthest + 1;
        }
        return result;
    }

    /** True if every tile on the line from `a` to `b` is passable (`a` itself isn't checked). */
    hasLine(a: Vec, b: Vec, minClearance: number): boolean {
        const dx = Math.abs(b.x - a.x);
        const dy = -Math.abs(b.y - a.y);
        const sx = a.x < b.x ? 1 : -1;
        const sy = a.y < b.y ? 1 : -1;
        let err = dx + dy;
        let x = a.x;
        let y = a.y;
        while (x !== b.x || y !== b.y) {
            const e2 = 2 * err;
            let movedX = false;
            let movedY = false;
            if (e2 >= dy) { err += dy; x += sx; movedX = true; }
            if (e2 <= dx) { err += dx; y += sy; movedY = true; }
            if (!this.isPassable({ x, y }, minClearance)) return false;
            if (movedX && movedY && !(this.isPassable({ x: x - sx, y }, minClearance) && this.isPassable({ x, y: y - sy }, minClearance))) {
                return false;
            }
        }
        return true;
    }

    private index(c: Vec): number {
        return c.y * this.width + c.x;
    }
}

/** Octile distance in path cost units. */
function heuristic(a: Vec, b: Vec): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return STRAIGHT_COST * (dx + dy) + (DIAGONAL_COST - 2 * STRAIGHT_COST) * Math.min(dx, dy);
}

function heapPush(heap: number[], value: number): void {
    heap.push(value);
    let i = heap.length - 1;
    while (i > 0) {
        const parent = (i - 1) >> 1;
        if (heap[parent] <= heap[i]) break;
        [heap[parent], heap[i]] = [heap[i], heap[parent]];
        i = parent;
    }
}

function heapPop(heap: number[]): number {
    const top = heap[0];
    const last = heap.pop() as number;
    if (heap.length === 0) return top;
    heap[0] = last;
    let i = 0;
    for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < heap.length && heap[left] < heap[smallest]) smallest = left;
        if (right < heap.length && heap[right] < heap[smallest]) smallest = right;
        if (smallest === i) break;
        [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
        i = smallest;
    }
    return top;
}
