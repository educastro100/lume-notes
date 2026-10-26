// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { DropArea, TAB_DRAG_TYPE } from './DropArea';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
function drag(node: Element, type: string, ids = ['a', 'b']) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    dataTransfer: { types: [TAB_DRAG_TYPE], getData: () => JSON.stringify(ids) },
    relatedTarget: null,
  });
  act(() => node.dispatchEvent(event));
}
describe('drag destinations', () => {
  it('highlights only the destination under the pointer and clears on exit/drop', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const assign = vi.fn();
    act(() =>
      root.render(
        <DropArea onAssign={assign}>
          <button>nota</button>
        </DropArea>,
      ),
    );
    const node = container.firstElementChild!;
    act(() => node.querySelector('button')!.click());
    expect(node.classList.contains('drop-hover')).toBe(false);
    drag(node, 'dragover');
    expect(node.classList.contains('drop-hover')).toBe(true);
    drag(node, 'dragleave');
    expect(node.classList.contains('drop-hover')).toBe(false);
    drag(node, 'dragover');
    drag(node, 'drop');
    expect(node.classList.contains('drop-hover')).toBe(false);
    expect(assign).toHaveBeenCalledWith(['a', 'b']);
    act(() => root.unmount());
  });
  it('does not let group drops also trigger the outside ungroup destination', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const outer = vi.fn(),
      inner = vi.fn();
    act(() =>
      root.render(
        <DropArea onAssign={outer}>
          <DropArea className="group" onAssign={inner}>
            grupo
          </DropArea>
        </DropArea>,
      ),
    );
    drag(container.querySelector('.group')!, 'dragover');
    expect(container.firstElementChild!.classList.contains('drop-hover')).toBe(false);
    drag(container.querySelector('.group')!, 'drop');
    expect(inner).toHaveBeenCalledOnce();
    expect(outer).not.toHaveBeenCalled();
    act(() => root.unmount());
  });
});

it('separates group reordering from moving notes, clears cancelled drops and honors busy state', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host),
    reorder = vi.fn(),
    assign = vi.fn();
  const render = (busy = false, horizontal = false) =>
    act(() =>
      root.render(
        <DropArea
          groupId="b"
          onReorderGroup={reorder}
          onAssign={assign}
          busy={busy}
          horizontal={horizontal}
        >
          group
        </DropArea>,
      ),
    );
  render();
  const node = host.firstElementChild!;
  node.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
  const fire = (type: string, x = 10, y = 90, source = 'a') => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      dataTransfer: { types: ['application/x-lume-group'], getData: () => source },
      clientX: x,
      clientY: y,
    });
    act(() => node.dispatchEvent(event));
    return event;
  };
  expect(fire('dragover').defaultPrevented).toBe(true);
  expect(node.classList.contains('group-drop-after')).toBe(true);
  expect(node.classList.contains('drop-hover')).toBe(false);
  act(() => document.dispatchEvent(new Event('dragend')));
  expect(node.classList.contains('group-drop-after')).toBe(false);
  fire('drop');
  expect(reorder).toHaveBeenLastCalledWith('a', 'b', 'after');
  expect(assign).not.toHaveBeenCalled();
  render(false, true);
  fire('dragover');
  expect(node.classList.contains('group-drop-before')).toBe(true);
  fire('drop');
  expect(reorder).toHaveBeenLastCalledWith('a', 'b', 'before');
  reorder.mockClear();
  fire('drop', 10, 90, 'b');
  expect(reorder).not.toHaveBeenCalled();
  render(true);
  expect(fire('dragover').defaultPrevented).toBe(false);
  fire('drop');
  expect(reorder).not.toHaveBeenCalled();
  act(() => root.unmount());
  host.remove();
});
