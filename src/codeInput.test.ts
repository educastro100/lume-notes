import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { history, undo, redo } from '@codemirror/commands';
import { separateCodeInputs } from './codeInput';
describe('source typing history', () => {
  it('separates adjacent typing events even at the same timestamp and keeps redo order', () => {
    let state = EditorState.create({ extensions: [history(), separateCodeInputs] });
    const snapshots = [''];
    for (const char of '1\n2\n3\n4\n5\n6') {
      state = state.update({
        changes: { from: state.doc.length, insert: char },
        userEvent: 'input.type',
      }).state;
      snapshots.push(state.doc.toString());
    }
    const dispatch = (transaction: { state: EditorState }) => {
      state = transaction.state;
    };
    for (let i = snapshots.length - 2; i >= 0; i--) {
      expect(undo({ state, dispatch })).toBe(true);
      expect(state.doc.toString()).toBe(snapshots[i]);
    }
    for (let i = 1; i < snapshots.length; i++) {
      expect(redo({ state, dispatch })).toBe(true);
      expect(state.doc.toString()).toBe(snapshots[i]);
    }
  });
});
