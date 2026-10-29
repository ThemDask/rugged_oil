/**
 * Player settings, saved in localStorage (works in browsers and in an Electron wrapper).
 * Settings only affect presentation and input, never the simulation.
 */
export interface Settings {
    /** 0..1 */
    masterVolume: number;
    musicVolume: number;
    effectsVolume: number;
    fullscreen: boolean;
    edgeScroll: boolean;
}

const STORAGE_KEY = 'rugged-oil.settings';

const DEFAULTS: Settings = {
    masterVolume: 0.8,
    musicVolume: 0.7,
    effectsVolume: 0.8,
    fullscreen: false,
    edgeScroll: true,
};

let current: Settings = load();

export function getSettings(): Readonly<Settings> {
    return current;
}

export function updateSettings(changes: Partial<Settings>): Settings {
    current = { ...current, ...changes };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
        // Storage unavailable (private mode etc.): keep the settings for this session only.
    }
    return current;
}

function load(): Settings {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
    } catch {
        return { ...DEFAULTS };
    }
}
