import type { SimGrid } from './grid';
import { planPath } from './pathing';
import type { Order, SimUnit } from './unit';

/**
 * Per-unit orders. The front of `unit.orders` is the current order; Shift-queued orders wait
 * behind it. Move and attack-move drive to their target (attack-move's fighting arrives with
 * combat in M5); capture, gather and attack follow in M4 and M5.
 */

/** Gives a unit an order: replaces its orders, or appends when `queue` is set (Shift). */
export function giveOrder(grid: SimGrid, unit: SimUnit, order: Order, queue: boolean): void {
    if (queue && unit.orders.length > 0) {
        unit.orders.push(order);
        return;
    }
    unit.orders = [order];
    startOrder(grid, unit);
}

/** Ends the current order once it's done and starts the next queued one. */
export function stepOrders(units: SimUnit[], grid: SimGrid): void {
    for (const unit of units) {
        const order = unit.orders[0];
        if (!order) continue;
        if ((order.type === 'move' || order.type === 'attackMove') && unit.waypoints.length === 0 && unit.speedFx === 0) {
            unit.orders.shift();
            startOrder(grid, unit);
        }
    }
}

/** Sets up the current order, e.g. plans the path for a move. */
function startOrder(grid: SimGrid, unit: SimUnit): void {
    const order = unit.orders[0];
    unit.waypoints = [];
    if (order?.type === 'move' || order?.type === 'attackMove') planPath(grid, unit, order.target);
}
