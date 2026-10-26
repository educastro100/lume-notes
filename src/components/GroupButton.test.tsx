// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { GroupButton } from './GroupButton';
import { GROUP_DRAG_TYPE } from './DropArea';
import type { TabGroup } from '../documents';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
it('starts a group drag with a distinct payload and supports reordering by keyboard', () => {
  const host = document.createElement('div'),
    root = createRoot(host);
  const groups: TabGroup[] = ['a', 'b', 'c'].map((id) => ({
    id,
    name: id,
    collapsed: false,
    color: 'sage',
  }));
  const reorder = vi.fn(),
    toggle = vi.fn(),
    setData = vi.fn();
  act(() =>
    root.render(
      <GroupButton
        group={groups[1]}
        groups={groups}
        busy={false}
        className="group-toggle"
        label="b"
        onToggle={toggle}
        onReorder={reorder}
      >
        b
      </GroupButton>,
    ),
  );
  const button = host.querySelector('button')!;
  const event = new Event('dragstart', { bubbles: true, cancelable: true });
  Object.assign(event, { dataTransfer: { setData, effectAllowed: 'none' } });
  act(() => button.dispatchEvent(event));
  expect(setData).toHaveBeenCalledExactlyOnceWith(GROUP_DRAG_TYPE, 'b');
  expect(toggle).not.toHaveBeenCalled();
  act(() =>
    button.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(reorder).toHaveBeenLastCalledWith('b', 'a', 'before');
  act(() =>
    button.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(reorder).toHaveBeenLastCalledWith('b', 'c', 'after');
  act(() => button.click());
  expect(toggle).toHaveBeenCalledExactlyOnceWith('b');
  act(() => root.unmount());
});
