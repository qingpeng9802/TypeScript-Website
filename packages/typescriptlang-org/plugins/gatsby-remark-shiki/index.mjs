import { visit } from 'unist-util-visit';
import { toHast, defaultHandlers } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { unified } from 'unified';
import rehypeShiki from '@shikijs/rehype';
import { transformerTwoslash } from '@shikijs/twoslash'

const processor = unified().use(rehypeShiki, {
  themes: {
    light: 'light-plus',
    dark: 'dark-plus',
  },
  transformers: [transformerTwoslash({ explicitTrigger: true })],
});

export default async ({ markdownAST }) => {
  const nodesToProcess = [];
  visit(markdownAST, 'code', (node) => {
    nodesToProcess.push(node);
  });

  await Promise.all(
    nodesToProcess.map(async (node) => {
      const miniHast = toHast(node, {
        allowDangerousHtml: true,
        passThrough: ['raw'],
        handlers: { code: defaultHandlers.code }
      });;

      const codeElement = (
        miniHast.type === 'element' &&
        miniHast.tagName === 'pre'
      )
        ? miniHast.children[0]
        : miniHast;
      if (node.meta && codeElement) {
        codeElement.data = codeElement.data || {};
        codeElement.data.meta = node.meta;
        codeElement.properties = codeElement.properties || {};
        codeElement.properties.metadata = node.meta;
      }

      const rootHast = { type: 'root', children: [miniHast] };
      const transformedHast = await processor.run(rootHast);

      node.type = 'html';
      node.value = toHtml(transformedHast, {
        allowDangerousHtml: true,
        allowDangerousCharacters: true,
        closeSelfClosing: true,
        useNamedReferences: true,
      });
    })
  );

  return markdownAST;
};