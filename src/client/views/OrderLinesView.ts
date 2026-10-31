import Phaser from 'phaser';
import type { Vec } from '../../sim/math';
import type { Order } from '../../sim/unit';
import type { SimWorld } from '../../sim/world';
import { simToPx } from '../scale';
import type { Selection } from '../systems/Selection';

/** HLD indicator colours: light blue for move, red for attack, yellow for gather. */
const COLORS: Record<Order['type'], number> = {
    move: 0x7fd8ff,
    capture: 0x7fd8ff,
    attack: 0xff3b30,
    attackMove: 0xff3b30,
    gather: 0xffd60a,
};

/**
 * HLD "Indicators": for each selected unit, a very thin line from the unit to the target of its
 * current order, continuing through any Shift-queued orders, with a small dot at each target.
 */
export class OrderLinesView {
    private readonly g: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, private readonly world: SimWorld, private readonly selection: Selection) {
        this.g = scene.add.graphics().setDepth(50);
    }

    update(): void {
        const g = this.g.clear();
        for (const view of this.selection.selected) {
            let from = { x: view.x, y: view.y };
            for (const order of view.unit.orders) {
                const target = this.targetOf(order, view.unit.playerId);
                if (!target) continue;
                const to = simToPx(target);
                g.lineStyle(1, COLORS[order.type], 0.9).lineBetween(from.x, from.y, to.x, to.y);
                g.fillStyle(COLORS[order.type]).fillCircle(to.x, to.y, 2);
                from = to;
            }
        }
    }

    private targetOf(order: Order, playerId: number): Vec | undefined {
        switch (order.type) {
            case 'move':
            case 'attackMove':
                return order.target;
            case 'attack':
                return this.world.units.get(order.targetId)?.position;
            case 'capture':
                return this.world.reqPoints.get(order.pointId)?.position;
            case 'gather':
                // A hauler on its way to deliver points at the HQ.
                if (order.phase === 'toHq') return this.world.hqOf(playerId)?.position;
                return this.world.reserves.get(order.reserveId)?.position;
        }
    }
}
