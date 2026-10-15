// Only the exact <u> pair becomes markup; arbitrary HTML remains disabled in previews.
export function remarkUnderline() {
  return (tree: any) => {
    function visit(node: any) {
      if (!node.children) return;
      const children = node.children;
      for (let index = 0; index < children.length; index++) {
        if (children[index].type === 'html' && children[index].value === '<u>') {
          const end = children.findIndex(
            (child: any, at: number) =>
              at > index && child.type === 'html' && child.value === '</u>',
          );
          if (end > index)
            children.splice(index, end - index + 1, {
              type: 'underline',
              data: { hName: 'u' },
              children: children.slice(index + 1, end),
            });
        }
      }
      children.forEach(visit);
    }
    visit(tree);
  };
}
