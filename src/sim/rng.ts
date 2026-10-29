/**
 * Seeded deterministic random numbers (mulberry32). The only source of randomness gameplay may
 * use. Pure 32-bit integer operations, so every machine produces the same sequence.
 */
export class SimRng {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
    }

    /** Next unsigned 32-bit integer. */
    nextUint32(): number {
        this.state = (this.state + 0x6d2b79f5) >>> 0;
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (t ^ (t >>> 14)) >>> 0;
    }

    /** Integer in [0, max). */
    nextInt(max: number): number {
        return this.nextUint32() % max;
    }

    getState(): number {
        return this.state;
    }
}
