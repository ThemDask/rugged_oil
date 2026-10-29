import Phaser from 'phaser';
import { getSettings, updateSettings, type Settings } from '../settings';
import { createButton, setButtonLabel } from './button';
import { Modal } from './modal';

type VolumeKey = 'masterVolume' | 'musicVolume' | 'effectsVolume';

/** Settings modal with Audio, Video and Input sections. Changes apply and save immediately. */
export class SettingsDialog extends Modal {
    constructor(scene: Phaser.Scene, onClose?: () => void) {
        super(scene, 'Settings', 520, 520);
        let y = -180;
        const section = (title: string) => {
            this.panel.add(scene.add.text(-220, y, title, { fontFamily: 'sans-serif', fontSize: '18px', color: '#c8a46e' }));
            y += 40;
        };

        section('Audio');
        this.volumeRow('Master', 'masterVolume', y);
        y += 48;
        this.volumeRow('Music', 'musicVolume', y);
        y += 48;
        this.volumeRow('Effects', 'effectsVolume', y);
        y += 60;

        section('Video');
        const fullscreen = createButton(scene, 0, y, this.toggleLabel('Fullscreen', getSettings().fullscreen), () => {
            const on = updateSettings({ fullscreen: !getSettings().fullscreen }).fullscreen;
            applyFullscreen(scene, on);
            setButtonLabel(fullscreen, this.toggleLabel('Fullscreen', on));
        }, 300);
        this.panel.add(fullscreen);
        y += 60;

        section('Input');
        const edge = createButton(scene, 0, y, this.toggleLabel('Edge scrolling', getSettings().edgeScroll), () => {
            const on = updateSettings({ edgeScroll: !getSettings().edgeScroll }).edgeScroll;
            setButtonLabel(edge, this.toggleLabel('Edge scrolling', on));
        }, 300);
        this.panel.add(edge);

        this.panel.add(createButton(scene, 0, 220, 'Close', () => {
            this.close();
            onClose?.();
        }, 160));
    }

    private toggleLabel(name: string, on: boolean): string {
        return `${name}: ${on ? 'On' : 'Off'}`;
    }

    private volumeRow(label: string, key: VolumeKey, y: number): void {
        const scene = this.scene;
        const text = scene.add.text(-220, y - 10, '', { fontFamily: 'sans-serif', fontSize: '18px', color: '#e8e2d6' });
        const refresh = () => text.setText(`${label}: ${Math.round(getSettings()[key] * 100)}%`);
        const change = (delta: number) => {
            const value = Math.min(1, Math.max(0, Math.round((getSettings()[key] + delta) * 10) / 10));
            applyVolume(scene, updateSettings({ [key]: value } as Partial<Settings>));
            refresh();
        };
        refresh();
        this.panel.add([text, createButton(scene, 130, y, '-', () => change(-0.1), 44), createButton(scene, 190, y, '+', () => change(0.1), 44)]);
    }
}

/** Applies the master volume to Phaser's sound manager. (Music/effects buses come with audio.) */
export function applyVolume(scene: Phaser.Scene, settings: Settings): void {
    scene.sound.volume = settings.masterVolume;
}

export function applyFullscreen(scene: Phaser.Scene, on: boolean): void {
    if (on && !scene.scale.isFullscreen) scene.scale.startFullscreen();
    if (!on && scene.scale.isFullscreen) scene.scale.stopFullscreen();
}
