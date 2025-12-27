// ============================================
// MEDIA PLAYER APPLICATION MODULE
// ============================================

import { escapeHtml } from '../utils/helpers';
import type { MediaPlayerState } from '../utils/types';

/**
 * Media Player Application Class
 * Handles playlist management, playback controls, visualizer, and equalizer
 */
export class MediaPlayerApp {
    public state: MediaPlayerState = {
        playlist: [],
        currentIndex: 0,
        shuffle: false,
        repeat: 'none',
        equalizerPreset: 'flat',
        visualizerMode: 'bars',
        volume: 70,
        isPlaying: false
    };

    public pipMode = false; // Picture-in-Picture mode toggle

    /**
     * Add file to playlist
     */
    addFile(path: string): void {
        if (!this.state.playlist.includes(path)) {
            this.state.playlist.push(path);
        }
    }

    /**
     * Remove file from playlist
     */
    removeFile(index: number): void {
        this.state.playlist.splice(index, 1);
        if (this.state.currentIndex >= this.state.playlist.length) {
            this.state.currentIndex = Math.max(0, this.state.playlist.length - 1);
        }
    }

    /**
     * Set current index
     */
    setIndex(index: number): void {
        if (index >= 0 && index < this.state.playlist.length) {
            this.state.currentIndex = index;
        }
    }

    /**
     * Play next track
     */
    nextTrack(): void {
        if (this.state.playlist.length === 0) return;

        if (this.state.shuffle) {
            this.state.currentIndex = Math.floor(Math.random() * this.state.playlist.length);
        } else {
            this.state.currentIndex = (this.state.currentIndex + 1) % this.state.playlist.length;
        }
    }

    /**
     * Play previous track
     */
    prevTrack(): void {
        if (this.state.playlist.length === 0) return;

        this.state.currentIndex = (this.state.currentIndex - 1 + this.state.playlist.length) % this.state.playlist.length;
    }

    /**
     * Toggle Shuffle
     */
    toggleShuffle(): boolean {
        this.state.shuffle = !this.state.shuffle;
        return this.state.shuffle;
    }

    /**
     * Toggle Repeat
     */
    toggleRepeat(): string {
        if (this.state.repeat === 'none') this.state.repeat = 'all';
        else if (this.state.repeat === 'all') this.state.repeat = 'one';
        else this.state.repeat = 'none';
        return this.state.repeat;
    }

    /**
     * Set Equalizer Preset
     */
    setSafeEqualizerPreset(preset: string): void {
        const validPresets: Array<'flat' | 'rock' | 'pop' | 'techno'> = ['flat', 'rock', 'pop', 'techno'];
        if (validPresets.includes(preset as 'flat' | 'rock' | 'pop' | 'techno')) {
            this.state.equalizerPreset = preset as 'flat' | 'rock' | 'pop' | 'techno';
        }
    }

    /**
     * Get HTML for Visualizer
     */
    getVisualizerHtml(): string {
        // Retro Style Bars
        const visualizerBars = Array.from({ length: 16 }).map(() => {
            const height = Math.floor(Math.random() * 80) + 10;
            // Use different animations based on preset for some "fake" reactivity
            const dur = this.state.equalizerPreset === 'techno' ? 0.2 :
                this.state.equalizerPreset === 'rock' ? 0.3 : 0.5;

            return `<div class="mp-bar" style="height: ${height}%; animation-duration: ${dur + Math.random() * 0.3}s;"></div>`;
        }).join('');

        return `
            <div class="mp-visualizer">
                ${visualizerBars}
            </div>
        `;
    }

    /**
     * Render Picture-in-Picture Mode (Mini Player)
     */
    renderPiPMode(): string {
        const currentFile = this.state.playlist[this.state.currentIndex];
        const fileName = currentFile ? currentFile.split(/[/\\]/).pop() : 'No Media';

        return `
            <div class="media-player-pip" style="height: 100%; display: flex; flex-direction: column; background: #000; color: #00ff41; font-family: 'VT323', monospace; padding: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-weight: bold; font-size: 12px; color: #ffd700;">📺 PiP Mode</div>
                    <div style="display: flex; gap: 5px;">
                        <button class="mp-btn-pip" data-mp-action="expand-pip" title="Expand" style="width: 20px; height: 20px; font-size: 10px;">⛶</button>
                        <button class="mp-btn-pip" data-mp-action="close-pip" title="Close" style="width: 20px; height: 20px; font-size: 10px;">×</button>
                    </div>
                </div>
                
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; background: #050505; border: 1px solid #00ff41; position: relative; overflow: hidden; min-height: 60px;">
                    ${currentFile ? `<audio id="mp-audio-pip" src="${currentFile}" autoplay></audio>` : ''}
                    <div style="font-size: 40px; opacity: 0.3;">🎵</div>
                </div>
                
                <div style="margin-top: 8px;">
                    <div style="font-size: 10px; text-align: center; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #ffd700;">
                        ${escapeHtml(fileName || 'No Media')}
                    </div>
                    <div style="display: flex; justify-content: center; gap: 8px;">
                        <button class="mp-btn-pip" data-mp-action="prev" title="Previous">⏮</button>
                        <button class="mp-btn-pip" data-mp-action="play" title="Play/Pause">▶/⏸</button>
                        <button class="mp-btn-pip" data-mp-action="next" title="Next">⏭</button>
                    </div>
                </div>
                
                <style>
                    .mp-btn-pip {
                        background: #000;
                        border: 1px solid #00ff41;
                        color: #00ff41;
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 0;
                    }
                    .mp-btn-pip:hover { background: rgba(0,255,65,0.2); }
                    .mp-btn-pip:active { transform: translateY(1px); }
                </style>
            </div>
        `;
    }

    /**
     * Render the Media Player Content
     */
    render(fileToPlay: string | null = null): string {
        // If fileToPlay is provided and different from current, add/play it
        if (fileToPlay) {
            // Logic handled by caller usually, but if we want to enforce it here:
            this.addFile(fileToPlay);
            const idx = this.state.playlist.indexOf(fileToPlay);
            if (idx !== -1 && idx !== this.state.currentIndex) {
                this.state.currentIndex = idx;
            }
        }

        const currentFile = this.state.playlist[this.state.currentIndex];
        const fileName = currentFile ? currentFile.split(/[/\\]/).pop() : 'No Media';
        const ext = currentFile ? currentFile.split('.').pop()?.toLowerCase() : '';
        const isVideo = ['mp4', 'webm', 'ogg', 'mkv'].includes(ext || '');

        const playlistHtml = this.state.playlist.map((f, i) => {
            const name = f.split(/[/\\]/).pop();
            const isActive = i === this.state.currentIndex;
            return `
                <div class="mp-playlist-item ${isActive ? 'active' : ''}" data-mp-index="${i}">
                    <span class="mp-icon">${isActive ? '▶' : '🎵'}</span>
                    <span class="mp-name">${escapeHtml(name || 'Unknown')}</span>
                    <button class="mp-remove-btn" data-mp-remove="${i}">×</button>
                </div>
            `;
        }).join('');

        return `
      <div class="media-player-app" data-mp-index="${this.state.currentIndex}" style="height: 100%; display: flex; flex-direction: column; background: #000; color: #00ff41; font-family: 'VT323', monospace;">
          <!-- Top Bar -->
          <div style="padding: 5px 10px; border-bottom: 2px solid #00ff41; display: flex; justify-content: space-between; align-items: center; background: rgba(0,255,65,0.1);">
              <div style="font-weight: bold; color: #ffd700;">MEDIA PILOT v2.0</div>
              <div class="mp-eq-display" style="font-size: 12px;">${this.state.equalizerPreset.toUpperCase()} EQ</div>
          </div>

          <div style="flex: 1; display: flex; overflow: hidden;">
            <!-- Main Content (Video or Visualizer) -->
            <div style="flex: 1; display: flex; flex-direction: column; position: relative; border-right: 1px solid rgba(0,255,65,0.3);">
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; background: #050505; position: relative; overflow: hidden;">
                    ${isVideo && currentFile ? `
                      <video id="mp-video" src="${currentFile}" autoplay controls style="width: 100%; max-height: 100%;"></video>
                    ` : `
                      ${currentFile ? `<audio id="mp-audio" src="${currentFile}" autoplay></audio>` : ''}
                      ${this.getVisualizerHtml()}
                      <div style="position: absolute; top: 10px; left: 10px; opacity: 0.5; font-size: 100px; pointer-events: none;">🎵</div>
                    `}
                </div>
                
                <!-- Controls -->
                <div style="padding: 10px; background: #111; border-top: 1px solid #00ff41;">
                    <div style="text-align: center; margin-bottom: 5px; color: #ffd700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(fileName || 'Playlist Empty')}
                    </div>
                    
                    <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 8px;">
                        <button class="mp-btn" data-mp-action="prev" title="Previous">⏮</button>
                        <button class="mp-btn" data-mp-action="stop" title="Stop">⏹</button>
                        <button class="mp-btn" data-mp-action="play" title="Play/Pause">▶/⏸</button>
                        <button class="mp-btn" data-mp-action="next" title="Next">⏭</button>
                    </div>
                    
                    <div style="display: flex; justify-content: center; gap: 15px; font-size: 12px;">
                        <button class="mp-toggle ${this.state.shuffle ? 'active' : ''}" data-mp-action="shuffle">🔀 Shuffle</button>
                        <button class="mp-toggle ${this.state.repeat !== 'none' ? 'active' : ''}" data-mp-action="repeat">🔁 Repeat: ${this.state.repeat}</button>
                        <button class="mp-toggle" data-mp-action="toggle-pip">📺 PiP</button>
                    </div>
                </div>
            </div>

            <!-- Playlist & EQ Sidebar -->
            <div style="width: 200px; display: flex; flex-direction: column; background: #0a0a0a;">
                <div style="padding: 8px; border-bottom: 1px solid #333; font-size: 12px; text-transform: uppercase; color: #888;">Playlist</div>
                <div class="mp-playlist-container" style="flex: 1; overflow-y: auto;">
                    ${playlistHtml || '<div style="padding: 10px; opacity: 0.5; text-align: center;">Drag & Drop files<br>or click Add</div>'}
                </div>
                
                <div style="border-top: 1px solid #333; padding: 10px;">
                    <button class="mp-btn-full" data-mp-action="add">➕ Add File</button>
                </div>

                <div style="border-top: 1px solid #333; padding: 10px;">
                    <div style="font-size: 11px; margin-bottom: 5px; color: #888;">EQUALIZER PRESET</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                        ${['flat', 'rock', 'pop', 'techno'].map(p => `
                          <button class="mp-eq-btn ${this.state.equalizerPreset === p ? 'active' : ''}" data-mp-eq="${p}">${p}</button>
                        `).join('')}
                    </div>
                </div>
            </div>
          </div>

          <style>
            .mp-visualizer {
              display: flex;
              align-items: flex-end;
              justify-content: center;
              gap: 4px;
              height: 100px;
              width: 100%;
              padding: 0 20px;
            }
            .mp-bar {
              flex: 1;
              background: #00ff41;
              opacity: 0.8;
              max-width: 20px;
              animation: mp-bounce 0.5s infinite ease-in-out alternate;
            }
            @keyframes mp-bounce {
              0% { transform: scaleY(0.2); }
              100% { transform: scaleY(1.0); }
            }
            .mp-btn {
              background: #000;
              border: 1px solid #00ff41;
              color: #00ff41;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              cursor: pointer;
              font-size: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .mp-btn:hover { background: rgba(0,255,65,0.2); }
            .mp-btn:active { transform: translateY(1px); }
            
            .mp-toggle {
              background: none;
              border: 1px solid #333;
              color: #888;
              padding: 4px 8px;
              border-radius: 4px;
              cursor: pointer;
              font-family: inherit;
              font-size: 11px;
            }
            .mp-toggle:hover { border-color: #00ff41; color: #00ff41; }
            .mp-toggle.active { background: #00ff41; color: #000; border-color: #00ff41; }
            
            .mp-playlist-item {
               padding: 5px;
               display: flex;
               align-items: center;
               gap: 5px;
               cursor: pointer;
               font-size: 13px;
               border-bottom: 1px solid #222;
            }
            .mp-playlist-item:hover { background: rgba(0,255,65,0.05); }
            .mp-playlist-item.active { background: rgba(0,255,65,0.15); color: #ffd700; }
            .mp-icon { width: 15px; text-align: center; }
            .mp-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .mp-remove-btn { 
               background: none; border: none; color: #555; cursor: pointer; font-size: 14px; 
               width: 20px; text-align: center;
            }
            .mp-remove-btn:hover { color: #ff6464; }
            
            .mp-btn-full {
               width: 100%;
               background: #111;
               border: 1px dashed #444;
               color: #888;
               padding: 5px;
               cursor: pointer;
               font-family: inherit;
               font-size: 12px;
            }
            .mp-btn-full:hover { border-color: #00ff41; color: #00ff41; }
            
            .mp-eq-btn {
               flex: 1;
               background: #111;
               border: 1px solid #333;
               color: #666;
               font-size: 10px;
               cursor: pointer;
               padding: 3px;
               text-transform: uppercase;
               min-width: 40px;
            }
            .mp-eq-btn:hover { border-color: #666; color: #aaa; }
            .mp-eq-btn.active { border-color: #00ff41; background: rgba(0,255,65,0.1); color: #00ff41; }
          </style>
      </div>
    `;
    }
}
