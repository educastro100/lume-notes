import { EditorState } from '@codemirror/state';
import { isolateHistory } from '@codemirror/commands';
export const separateCodeInputs = EditorState.transactionExtender.of((transaction) => {
  if (!transaction.docChanged || transaction.isUserEvent('input.type.compose')) return null;
  return transaction.isUserEvent('input') || transaction.isUserEvent('delete')
    ? { annotations: isolateHistory.of('full') }
    : null;
});
