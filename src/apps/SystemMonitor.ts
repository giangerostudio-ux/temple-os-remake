// ============================================
// SYSTEM MONITOR ENHANCEMENT MODULE
// ============================================

import type { MonitorStats, CPUHistoryPoint } from '../utils/types';
import { CPU_HISTORY_SIZE } from '../utils/constants';
import { formatMemory, formatUptime, clamp } from '../utils/helpers';

/**
 * System Monitor Enhancement Class
 * Handles real-time CPU graphing and GPU monitoring
 */
export class SystemMonitorEnhancer {
  private cpuHistory: CPUHistoryPoint[] = [];
  private gpuUsage: number | null = null;
  private gpuMemory: { used: number; total: number } | null = null;
  private gpuName: string | null = null;

  /**
   * Add CPU usage data point
   */
  addCPUDataPoint(usage: number): void {
    const point: CPUHistoryPoint = {
      timestamp: Date.now(),
      usage: clamp(usage, 0, 100),
    };

    this.cpuHistory.push(point);

    // Keep only last N points
    if (this.cpuHistory.length > CPU_HISTORY_SIZE) {
      this.cpuHistory.shift();
    }
  }

  /**
   * Get CPU history
   */
  getCPUHistory(): CPUHistoryPoint[] {
    return this.cpuHistory;
  }

  /**
   * Update GPU stats (if available)
   */
  updateGPUStats(usage: number | null, memoryUsed?: number, memoryTotal?: number, name?: string): void {
    this.gpuUsage = usage;
    if (memoryUsed !== undefined && memoryTotal !== undefined) {
      this.gpuMemory = { used: memoryUsed, total: memoryTotal };
    }
    if (name) {
      this.gpuName = name;
    }
  }

  /**
   * Render CPU usage graph on canvas
   */
  renderCPUGraph(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.1)';
    ctx.lineWidth = 1;

    // Horizontal grid lines (25%, 50%, 75%)
    for (let i = 1; i <= 3; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw CPU usage line
    if (this.cpuHistory.length < 2) return;

    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const pointWidth = width / CPU_HISTORY_SIZE;

    this.cpuHistory.forEach((point, index) => {
      const x = index * pointWidth;
      const y = height - (point.usage / 100) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Fill area under line
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 255, 65, 0.1)';
    ctx.fill();

    // Draw labels
    ctx.fillStyle = '#00ff41';
    ctx.font = '10px monospace';
    ctx.fillText('100%', 5, 10);
    ctx.fillText('50%', 5, height / 2);
    ctx.fillText('0%', 5, height - 5);
  }

  /**
   * Render GPU stats section
   */
  renderGPUStats(): string {
    if (this.gpuUsage === null && !this.gpuName) {
      return `
        <div style="padding: 10px; opacity: 0.5; text-align: center;">
          GPU monitoring not available
        </div>
      `;
    }

    const usageBar = this.gpuUsage !== null
      ? `
        <div style="margin-top: 5px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span>Usage</span>
            <span>${this.gpuUsage.toFixed(1)}%</span>
          </div>
          <div style="height: 8px; background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${this.gpuUsage}%; background: #00ff41; transition: width 0.3s;"></div>
          </div>
        </div>
      `
      : '';

    const memoryBar = this.gpuMemory
      ? `
        <div style="margin-top: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span>VRAM</span>
            <span>${formatMemory(this.gpuMemory.used)} / ${formatMemory(this.gpuMemory.total)}</span>
          </div>
          <div style="height: 8px; background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${(this.gpuMemory.used / this.gpuMemory.total) * 100}%; background: #00ff41; transition: width 0.3s;"></div>
          </div>
        </div>
      `
      : '';

    return `
      <div style="padding: 10px;">
        <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px;">
          🎮 ${this.gpuName || 'GPU'}
        </div>
        ${usageBar}
        ${memoryBar}
      </div>
    `;
  }

  /**
   * Render enhanced system monitor content
   */
  renderMonitorContent(stats: MonitorStats | null): string {
    if (!stats) {
      return '<div style="padding: 20px; text-align: center;">Loading system stats...</div>';
    }

    // Add current CPU to history
    if (stats.cpuPercent !== null) {
      this.addCPUDataPoint(stats.cpuPercent);
    }

    const cpuUsage = stats.cpuPercent !== null ? stats.cpuPercent.toFixed(1) : 'N/A';
    const cpuPercent = stats.cpuPercent !== null ? stats.cpuPercent : 0;
    const memUsedGB = stats.memory.used / (1024 ** 3);
    const memTotalGB = stats.memory.total / (1024 ** 3);
    const memPercent = (stats.memory.used / stats.memory.total) * 100;

    const diskPercent = stats.disk?.percent || 0;
    const diskUsedGB = stats.disk ? stats.disk.used / (1024 ** 3) : 0;
    const diskTotalGB = stats.disk ? stats.disk.total / (1024 ** 3) : 0;

    const netRx = stats.network ? (stats.network.rxBps / 1024).toFixed(1) : '0';
    const netTx = stats.network ? (stats.network.txBps / 1024).toFixed(1) : '0';

    return `
      <div style="display: flex; flex-direction: column; height: 100%; overflow-y: auto; padding: 10px; gap: 15px;">
        
        <!-- System Info Header -->
        <div style="padding: 10px; background: rgba(0,255,65,0.05); border: 1px solid rgba(0,255,65,0.2); border-radius: 4px;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">⚙️ ${stats.hostname}</div>
          <div style="font-size: 12px; opacity: 0.8;">
            ${stats.cpuCores} cores • Uptime: ${formatUptime(stats.uptime)}
          </div>
        </div>

        <!-- CPU Usage (no graph, just bar like Memory/Disk) -->
        <div style="padding: 10px; background: rgba(0,255,65,0.05); border: 1px solid rgba(0,255,65,0.2); border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
            <span style="font-weight: bold;">💻 CPU</span>
            <span>${cpuUsage}%</span>
          </div>
          <div style="height: 20px; background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${cpuPercent}%; background: #00ff41; transition: width 0.3s; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #000;">
              ${cpuUsage}%
            </div>
          </div>
        </div>

        <!-- Memory -->
        <div style="padding: 10px; background: rgba(0,255,65,0.05); border: 1px solid rgba(0,255,65,0.2); border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
            <span style="font-weight: bold;">💾 Memory</span>
            <span>${memUsedGB.toFixed(1)} GB / ${memTotalGB.toFixed(1)} GB</span>
          </div>
          <div style="height: 20px; background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${memPercent}%; background: #00ff41; transition: width 0.3s; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #000;">
              ${memPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        <!-- Disk -->
        <div style="padding: 10px; background: rgba(0,255,65,0.05); border: 1px solid rgba(0,255,65,0.2); border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
            <span style="font-weight: bold;">💿 Disk</span>
            <span>${diskUsedGB.toFixed(1)} GB / ${diskTotalGB.toFixed(1)} GB</span>
          </div>
          <div style="height: 20px; background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${diskPercent}%; background: #00ff41; transition: width 0.3s; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #000;">
              ${diskPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        <!-- Network -->
        <div style="padding: 10px; background: rgba(0,255,65,0.05); border: 1px solid rgba(0,255,65,0.2); border-radius: 4px;">
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px;">🌐 Network</div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>⬇ Download: ${netRx} KB/s</span>
            <span>⬆ Upload: ${netTx} KB/s</span>
          </div>
        </div>

        <!-- GPU (if available) -->
        <div style="background: rgba(0,255,65,0.05); border: 1px solid rgba(0,255,65,0.2); border-radius: 4px;">
          ${this.renderGPUStats()}
        </div>

      </div>
    `;
  }

  /**
   * Start auto-refresh for graph
   */
  startAutoRefresh(canvas: HTMLCanvasElement): number {
    return window.setInterval(() => {
      this.renderCPUGraph(canvas);
    }, 1000);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.cpuHistory = [];
  }
}
