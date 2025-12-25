import { visit } from 'unist-util-visit';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { unified } from 'unified';
import rehypeShiki from '@shikijs/rehype';
import { transformerTwoslash } from '@shikijs/twoslash'
import pLimit from 'p-limit';
import fs from 'node:fs';
import v8 from 'node:v8';

import path from 'node:path';

console.log('cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc')
/**
 * @typedef {import('mdast').Root} MdastRoot
 * @typedef {import('mdast').Code} MdastCode
 * @typedef {import('mdast').Html} MdastHtml
 * @typedef {import('hast').Root} HastRoot
 */
/*
import inspector from 'node:inspector';
import { promisify } from 'node:util';
const sleep = promisify(setTimeout);

// This loop prevents the code from running until you actually 
// click 'inspect' in your browser.
if (!inspector.url()) {
  console.log('🔴 Waiting for debugger to attach...');
  while (!inspector.url()) {
      await sleep(200); 
    }
  console.log('🟢 Debugger attached!');
}
*/
//debugger; // Now it will definitely stop here
/** @type {Map<string, import('@typescript/vfs').VirtualTypeScriptEnvironment>} */
const twoslashCache = new Map();
const limit = pLimit(1);

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
      typesCache: {
        read: (code) => twoslashCache.get(code),
        write: (code, twoslash) => {
          // Logic to prevent the cache from exploding
          if (twoslashCache.size > 5) {
            twoslashCache.clear();
            if (global.gc) global.gc();
            console.log("♻️ Types Cache Cleared");
          }
          twoslashCache.set(code, twoslash);
        }
      }
    })
  ],
});
/**
 * Log the current heap memory usage
 * @param {string} step - A label for where the log is happening
 */
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
async function applyTwoslash({ markdownAST }) {
  return globalLock = globalLock.then(async () => {

    /** @type {import('unified').Processor<HastRoot, HastRoot, HastRoot, HastRoot, string>} */

    /** @type {MdastCode[]} */
    const nodesToProcess = [];
    visit(markdownAST, 'code',
      /** @param {MdastCode} node */
      (node) => {
        nodesToProcess.push(node);
      });

    for (let index = 0; index < nodesToProcess.length; index++) {
      const node = nodesToProcess[index];


      console.log(`mmm  ${twoslashCache.size}`)
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

      logMemory(`After Node ${index}`);
      if (twoslashCache.size > 50) {
        twoslashCache.clear();
        console.log('♻️ Twoslash cache cleared to prevent OOM');
      }

      if (index === 0 || index === 1) {
        if (global.gc) {
          console.log('🧹 Running manual Garbage Collection...');
          global.gc();
        } else {
          console.warn('⚠️ Garbage collection not exposed. Run with --expose-gc');
        }
        const reportDir = path.join(process.cwd(), 'reports');

        if (!fs.existsSync(reportDir)) {
          console.log(`📁 Creating directory: ${reportDir}`);
          fs.mkdirSync(reportDir, { recursive: true });
        }

        const filename = path.join(reportDir, `leak-report-${index}.heapsnapshot`);

        console.log('Writing snapshot sync...');
        v8.writeHeapSnapshot(filename);
        console.log('Done!'); // This will only print AFTER the file is saved
      }
    }


    return markdownAST;
  });
}

export default applyTwoslash;
