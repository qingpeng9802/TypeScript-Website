import { visit } from 'unist-util-visit';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { unified } from 'unified';
import rehypeShiki from '@shikijs/rehype';
import { transformerTwoslash } from '@shikijs/twoslash'



/**
 * @typedef {import('mdast').Root} MdastRoot
 * @typedef {import('mdast').Code} MdastCode
 * @typedef {import('mdast').Html} MdastHtml
 * @typedef {import('hast').Root} HastRoot
 */

/** @return {import('unified').Processor<HastRoot, HastRoot, HastRoot, HastRoot, string>} */
const createprocessor = () => unified().use(rehypeShiki, {
  themes: {
    light: 'light-plus',
    dark: 'dark-plus',
  },
  transformers: [
    transformerTwoslash({
      explicitTrigger: true,
      //cache: twoslashCache,
      twoslashOptions: {
        compilerOptions: {
          skipLibCheck: true,
        }
      },
      cache: false
    })
  ],
});

function logMemory(step) {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`[MEM] ${step}: ${Math.round(used)} MB`);
}

const processor = createprocessor();
let globalLock = Promise.resolve();

/** 
 * @param {{ markdownAST: MdastRoot }} args
 * @returns {Promise<MdastRoot>}
 */
let globalIndex = 0;

import pLimit from 'p-limit';
const limit = pLimit(1);
async function heavyTask(markdownAST) {
  /** @type {MdastCode[]} */
  const nodesToProcess = [];
  visit(markdownAST, 'code',
    /** @param {MdastCode} node */
    (node) => {
      console.log('                    node=================')
      nodesToProcess.push(node);
    });

  await Promise.all(
    nodesToProcess.map((node, index) =>
      limit(async () => {
        logMemory(`Before Node ${index}`);
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

        //global.gc();
        logMemory(`After Node ${index}`);
      })
    )
  );
}



async function applyTwoslash({ markdownAST }) {
  console.log('text++++')

  await heavyTask(markdownAST);



}

export default applyTwoslash;
