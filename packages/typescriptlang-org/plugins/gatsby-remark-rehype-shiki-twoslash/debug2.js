import { visit } from 'unist-util-visit';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { unified } from 'unified';
import rehypeShiki from '@shikijs/rehype';
import { createTwoslasher } from 'twoslash'
import { createTransformerFactory, rendererRich} from '@shikijs/twoslash'

import pLimit from 'p-limit';
import fs from 'node:fs';
import v8 from 'node:v8';
import { pipeline } from 'node:stream/promises';

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

const twoslasher = createTwoslasher({cache: false});
function transformerTwoslash(options) {
  return createTransformerFactory(
    createTwoslasher({
      cache: options?.cache,
      compilerOptions: {
        moduleResolution: 100,
      },
    }),
    rendererRich(options.rendererRich),
  )(options)
}
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
/**
 * Log the current heap memory usage
 * @param {string} step - A label for where the log is happening
 */
function logMemory(step) {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`[MEM] ${step}: ${Math.round(used)} MB`);
}

async function takeSnapshot(filename) {
  const snapshotStream = v8.getHeapSnapshot();
  const fileStream = fs.createWriteStream(filename);

  // pipeline handles errors and waits for the stream to finish
  await pipeline(snapshotStream, fileStream);

  console.log(`Snapshot saved to ${filename}`);
}
const processor = createprocessor();
let globalLock = Promise.resolve();
/** 
 * @param {{ markdownAST: MdastRoot }} args
 * @returns {Promise<MdastRoot>}
 */
let globalIndex = 0;
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

      //global.gc();
      logMemory(`After Node ${index}`);
      if (twoslashCache.size > 50) {
        twoslashCache.clear();
        console.log('♻️ Twoslash cache cleared to prevent OOM');
      }
      twoslasher.getCacheMap()?.clear()
      logMemory(`After CLEAN Node ${index}`);
      if (twoslashCache.size > 50) {
        twoslashCache.clear();
        console.log('♻️ Twoslash cache cleared to prevent OOM');
      }
      /*
            if (globalIndex === 1 || globalIndex === 10) {
              //if (global.gc) {
              //  console.log('🧹 Running manual Garbage Collection...');
              //  global.gc();
              //} else {
              //  console.warn('⚠️ Garbage collection not exposed. Run with --expose-gc');
              //}
              const reportDir = path.join(process.cwd(), 'reports');
      
              if (!fs.existsSync(reportDir)) {
                console.log(`📁 Creating directory: ${reportDir}`);
                fs.mkdirSync(reportDir, { recursive: true });
              }
      
              const filename = path.join(reportDir, `leak-report-${globalIndex}.heapsnapshot`);
      
              console.log('Writing snapshot sync...');
              await takeSnapshot(filename);
              //console.log('Done!'); // This will only print AFTER the file is saved
      
              if (globalIndex===5) {
                throw new Error('finish!')
              }
            }
      
        globalIndex++;
        */
    }


    return markdownAST;
  });
}

export default applyTwoslash;



/**
 * Helper to convert bytes to Megabytes
 */
import { PerformanceObserver, constants } from 'node:perf_hooks';


// Helper to format bytes to human-readable MB
const formatMB = (bytes) => bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : 'N/A';

const obs = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // We only care about MAJOR GC (Mark-Sweep-Compact)
    if (entry.kind === constants.NODE_PERFORMANCE_GC_MAJOR) {
      const now = new Date().toISOString();
      const detail = entry.detail;

      console.log(`\n==============================================`);
      console.log(`✨ [${now}] MAJOR GC REPORT`);
      console.log(`==============================================`);
      console.log(`⏱️  Pause Duration : ${entry.duration.toFixed(3)} ms`);

      if (detail && detail.beforeGC && detail.afterGC) {
        // Method A: Built-in Telemetry (Most accurate)
        console.log(`📊 Source          : Performance Detail (Direct)`);
        console.log(`📉 Heap Before    : ${formatMB(detail.beforeGC.usedHeapSize)}`);
        console.log(`📈 Heap After     : ${formatMB(detail.afterGC.usedHeapSize)}`);
        console.log(`♻️  Memory Freed   : ${formatMB(detail.beforeGC.usedHeapSize - detail.afterGC.usedHeapSize)}`);
      } else {
        // Method B: Manual Fallback (Using v8 module)
        const stats = v8.getHeapStatistics();
        console.log(`📊 Source          : V8 Stats Fallback`);
        console.log(`📈 Current Used   : ${formatMB(stats.used_heap_size)}`);
        console.log(`🏗️  Total Physical : ${formatMB(stats.total_physical_size)}`);
        console.log(`⚠️  Note            : Detailed 'Before' stats were unavailable.`);
      }
      
      console.log(`==============================================\n`);
    }
  }
});

// buffered: false ensures we get the events immediately
obs.observe({ entryTypes: ['gc'], buffered: false });

console.log('🚀 Monitor Active: Watching for Major GC events in Node v22...');