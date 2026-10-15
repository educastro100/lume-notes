// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ResizeDivider } from './ResizeDivider';
import { FontSizeControl } from './FontSizeControl';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
describe('workspace controls', () => {
  it('resizes by pointer with limits and supports keyboard/reset without selecting text', () => {
    const element = document.createElement('div'),
      root = createRoot(element);
    const change = vi.fn(),
      resizing = vi.fn();
    act(() =>
      root.render(
        <ResizeDivider
          label="Painel"
          value={246}
          min={200}
          max={440}
          reset={246}
          onChange={change}
          onResizing={resizing}
        />,
      ),
    );
    const divider = element.firstElementChild! as HTMLDivElement;
    divider.setPointerCapture = vi.fn();
    function pointer(type: string, x: number) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { pointerId: 1, button: 0, clientX: x });
      act(() => divider.dispatchEvent(event));
      return event;
    }
    expect(pointer('pointerdown', 100).defaultPrevented).toBe(true);
    pointer('pointermove', 1000);
    expect(change).toHaveBeenLastCalledWith(440);
    pointer('pointermove', -1000);
    expect(change).toHaveBeenLastCalledWith(200);
    pointer('pointerup', 100);
    expect(resizing).toHaveBeenLastCalledWith(false);
    act(() => divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })));
    expect(change).toHaveBeenLastCalledWith(440);
    act(() => divider.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    expect(change).toHaveBeenLastCalledWith(246);
    act(() => root.unmount());
  });
  it('uses the scroll wheel on font controls and prevents page scrolling', () => {
    const element = document.createElement('div'),
      root = createRoot(element),
      change = vi.fn();
    act(() => root.render(<FontSizeControl value={15} onChange={change} />));
    const event = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
    act(() => element.firstElementChild!.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(change).toHaveBeenCalledWith(16);
    act(() => root.render(<FontSizeControl value={28} onChange={change} />));
    const next = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
    Object.defineProperty(next, 'timeStamp', { value: event.timeStamp + 100 });
    act(() => element.firstElementChild!.dispatchEvent(next));
    expect(change).toHaveBeenLastCalledWith(28);
    act(() => root.unmount());
  });
});
