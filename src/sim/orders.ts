import type { SimUnit } from './unit';

/**
 * Per-unit order handling. The front of `unit.orders` is the current order. For now only `move`
 * is carried out (it drives along the planned path and ends on arrival); attack, attack-move,
 * capture and gather follow in M4 and M5.
 */
export function stepOrders(units: SimUnit[]): void {
    for (const unit of units) {
        const order = unit.orders[0];
        if (order?.type === 'move' && unit.waypoints.length === 0 && unit.speedFx === 0) unit.orders.shift();
    }
}
