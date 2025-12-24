import { visit } from 'unist-util-visit';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { unified } from 'unified';
import rehypeShiki from '@shikijs/rehype';
import { transformerTwoslash } from '@shikijs/twoslash'
console.log('cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc')
/**
 * @typedef {import('mdast').Root} MdastRoot
 * @typedef {import('mdast').Code} MdastCode
 * @typedef {import('mdast').Html} MdastHtml
 * @typedef {import('hast').Root} HastRoot
 */

/** @type {import('unified').Processor<HastRoot, HastRoot, HastRoot, HastRoot, string>} */
const processor = unified().use(rehypeShiki, {
  themes: {
    light: 'light-plus',
    dark: 'dark-plus',
  },
  transformers: [transformerTwoslash({ explicitTrigger: true })],
});

/** 
 * @param {{ markdownAST: MdastRoot }} args
 * @returns {Promise<MdastRoot>}
 */
async function applyTwoslash({ markdownAST }) {
  /** @type {MdastCode[]} */
  const nodesToProcess = [];
  visit(markdownAST, 'code',
    /** @param {MdastCode} node */
    (node) => {
      nodesToProcess.push(node);
    });

  await Promise.all(
    nodesToProcess.map(async (node) => {
      /** @type {HastRoot} */
      const hast = toHast(node);

      const codeElement = hast.children[0]
      if (node.meta && codeElement) {
        codeElement.data = { meta: node.meta };
      }

      /** @type {HastRoot} */
      const rootHast = { type: 'root', children: [hast] };
      const transformedHast = await processor.run(rootHast);

      node.type = 'html';
      node.value = toHtml(transformedHast);
    })
  );

  return markdownAST;
}

export default applyTwoslash;
