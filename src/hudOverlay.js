import { clamp } from './utils.js';
import { VERIFICATION_STATUS, VERIFICATION_LABELS } from './models/registry.js';

/**
 * Renders futuristic holographic JARVIS-style HUD scanning brackets,
 * telemetry indicators, and targeting reticles around recognized objects.
 * Supports multiple simultaneous visible objects and target selection.
 */
export class ScannerHUD {
  constructor() {
    this.bracketAlpha = 0;
    this.targetAlpha = 0;
    this.pulse = 0;
  }

  /**
   * Draw holographic scanner overlay on 2D context.
   */
  draw(ctx, W, H, detection, allDetections = [], scannerState, viewMode = 'internal', dt = 0.016) {
    this.pulse += dt * 3.0;

    const hasTarget = detection && detection.screenBox && detection.screenBox.w > 0.02;
    this.targetAlpha = hasTarget ? 1.0 : 0.0;
    this.bracketAlpha = clamp(this.bracketAlpha + (this.targetAlpha - this.bracketAlpha) * 0.15, 0, 1);

    // Draw secondary detected objects in background
    if (allDetections && allDetections.length > 1) {
      for (const other of allDetections) {
        if (!other.screenBox || other.id === detection?.id) continue;
        const ob = other.screenBox;
        const ox = ob.x * W;
        const oy = ob.y * H;
        const ow = ob.w * W;
        const oh = ob.h * H;
        if (ow < 20 || oh < 20) continue;

        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = '#35e6ff';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);

        const c = Math.min(16, Math.min(ow, oh) * 0.2);
        ctx.beginPath();
        ctx.moveTo(ox, oy + c);
        ctx.lineTo(ox, oy);
        ctx.lineTo(ox + c, oy);
        ctx.moveTo(ox + ow - c, oy);
        ctx.lineTo(ox + ow, oy);
        ctx.lineTo(ox + ow, oy + c);
        ctx.moveTo(ox, oy + oh - c);
        ctx.lineTo(ox, oy + oh);
        ctx.lineTo(ox + c, oy + oh);
        ctx.moveTo(ox + ow - c, oy + oh);
        ctx.lineTo(ox + ow, oy + oh);
        ctx.lineTo(ox + ow, oy + oh - c);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.font = '500 10px ui-sans-serif, system-ui, sans-serif';
        ctx.fillStyle = '#80d8ff';
        ctx.fillText(`⌖ ${other.label.toUpperCase()} (${Math.round(other.confidence * 100)}%)`, ox, oy - 4);
        ctx.restore();
      }
    }

    if (!detection || !detection.screenBox || this.bracketAlpha < 0.01) return;

    const b = detection.screenBox;
    const x = b.x * W;
    const y = b.y * H;
    const w = b.w * W;
    const h = b.h * H;

    const isVerified = detection.modelMatch?.status === VERIFICATION_STATUS.VERIFIED;
    const isEstimated = detection.modelMatch?.status === VERIFICATION_STATUS.ESTIMATED;
    const mainColor = isVerified ? '#6ff0a8' : isEstimated ? '#35e6ff' : '#f2c94c';
    const glowColor = isVerified
      ? 'rgba(111, 240, 168, 0.85)'
      : isEstimated
      ? 'rgba(53, 230, 255, 0.85)'
      : 'rgba(242, 201, 76, 0.85)';

    ctx.save();
    ctx.globalAlpha = this.bracketAlpha;
    ctx.strokeStyle = mainColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.0;

    // Corner bracket size
    const corner = Math.min(28, Math.min(w, h) * 0.25);

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(x, y + corner);
    ctx.lineTo(x, y);
    ctx.lineTo(x + corner, y);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(x + w - corner, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + corner);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(x, y + h - corner);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + corner, y + h);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(x + w - corner, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - corner);
    ctx.stroke();

    // Center targeting crosshair
    const cx = x + w / 2;
    const cy = y + h / 2;
    const cross = 9;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - cross, cy);
    ctx.lineTo(cx + cross, cy);
    ctx.moveTo(cx, cy - cross);
    ctx.lineTo(cx, cy + cross);
    ctx.stroke();

    // Circular targeting reticle in center
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Animated scanning laser sweep (in external scanner view)
    if (viewMode === 'external') {
      const scanY = y + ((Math.sin(this.pulse) + 1) / 2) * h;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x + 4, scanY);
      ctx.lineTo(x + w - 4, scanY);
      ctx.stroke();
    }

    // Telemetry label badge above box
    const label = `${detection.label.toUpperCase()} [${Math.round(detection.confidence * 100)}%]`;
    const statusText = detection.modelMatch?.model
      ? VERIFICATION_LABELS[detection.modelMatch.status] || 'MODEL MATCH'
      : 'NO CAD ASSET';

    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = mainColor;
    ctx.shadowBlur = 8;
    ctx.fillText(`⌖ LOCKED TARGET: ${label}`, x, y - 20);

    ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = isVerified ? '#6ff0a8' : isEstimated ? '#ffb74d' : '#e0e0e0';
    ctx.fillText(`STATUS: ${statusText}`, x, y - 6);

    ctx.restore();
  }
}
