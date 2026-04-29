import type { AnchorPosition } from './types';

/**
 * Handles anchor resolution and boundary clamping.
 * All calculations are relative to window.innerWidth / window.innerHeight.
 */
export class PositionEngine {
  constructor(public boundaryPadding = 8) {}

  /**
   * Convert an anchor + offset pair into absolute viewport coordinates,
   * then clamp to stay within the viewport.
   */
  resolveAnchor(
    anchor: AnchorPosition,
    offsetX: number | string,
    offsetY: number | string,
    width: number,
    height: number,
  ): { x: number; y: number } {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ox = this.toPx(offsetX, vw);
    const oy = this.toPx(offsetY, vh);

    let x: number;
    let y: number;

    switch (anchor) {
      case 'top-left':
        x = ox;
        y = oy;
        break;
      case 'top-right':
        x = vw - width - ox;
        y = oy;
        break;
      case 'bottom-left':
        x = ox;
        y = vh - height - oy;
        break;
      case 'bottom-right':
      default:
        x = vw - width - ox;
        y = vh - height - oy;
        break;
    }

    return this.clamp(x, y, width, height);
  }

  /**
   * Clamp position so the panel stays inside the viewport with at least
   * `boundaryPadding` px on all four sides.
   */
  clamp(x: number, y: number, width: number, height: number): { x: number; y: number } {
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;
    const pad = this.boundaryPadding;
    return {
      x: Math.min(Math.max(x, pad), Math.max(pad, vw - width  - pad)),
      y: Math.min(Math.max(y, pad), Math.max(pad, vh - height - pad)),
    };
  }

  /**
   * After a drag ends, snap the panel to the nearest viewport edge
   * (left, right, top, or bottom) based on which edge the panel centre
   * is closest to.
   */
  snapToNearestEdge(
    x: number,
    y: number,
    width: number,
    height: number,
  ): { x: number; y: number } {
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;
    const pad = this.boundaryPadding;
    const centerX = x + width  / 2;
    const centerY = y + height / 2;

    const distLeft   = centerX;
    const distRight  = vw - centerX;
    const distTop    = centerY;
    const distBottom = vh - centerY;

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    let newX = x;
    let newY = y;
    if      (minDist === distLeft)   newX = pad;
    else if (minDist === distRight)  newX = vw - width  - pad;
    else if (minDist === distTop)    newY = pad;
    else                             newY = vh - height - pad;

    return this.clamp(newX, newY, width, height);
  }

  /**
   * Resolve `maxWidth` / `maxHeight` values that may be expressed as
   * viewport-relative strings like `'90vh'` or `'80vw'`.
   */
  resolveMax(value: number | string, axis: 'width' | 'height'): number {
    if (typeof value === 'number') return value;
    const vhMatch = /^([\d.]+)vh$/i.exec(value);
    if (vhMatch) return (parseFloat(vhMatch[1]) / 100) * window.innerHeight;
    const vwMatch = /^([\d.]+)vw$/i.exec(value);
    if (vwMatch) return (parseFloat(vwMatch[1]) / 100) * window.innerWidth;
    const num = parseFloat(value);
    return isNaN(num)
      ? axis === 'height' ? window.innerHeight * 0.9 : window.innerWidth * 0.9
      : num;
  }

  private toPx(value: number | string, dimension: number): number {
    if (typeof value === 'number') return value;
    const pctMatch = /^([\d.]+)%$/.exec(value);
    if (pctMatch) return (parseFloat(pctMatch[1]) / 100) * dimension;
    return parseFloat(value) || 0;
  }
}
