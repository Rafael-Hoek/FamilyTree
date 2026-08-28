import { useRef } from "react";

const DRAG_THRESHOLD_PX = 5;

/**
 * react-zoom-pan-pinch drags the view by listening to mousedown/mousemove
 * directly — it doesn't suppress the native `click` a browser still fires
 * on mouseup, even after a multi-pixel drag. Without this, dragging across
 * a card to pan the tree would also "click" whatever was under the cursor.
 */
export function useDragAwareClick() {
  const downPosition = useRef<{ x: number; y: number } | null>(null);

  function onMouseDown(event: React.MouseEvent) {
    downPosition.current = { x: event.clientX, y: event.clientY };
  }

  function wasDrag(event: { clientX: number; clientY: number }): boolean {
    const start = downPosition.current;
    if (!start) return false;
    return Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_THRESHOLD_PX;
  }

  return { onMouseDown, wasDrag };
}
