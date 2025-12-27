import { parentPort, workerData } from 'node:worker_threads';
import { visit } from 'unist-util-visit';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { unified } from 'unified';
// Import your specific plugins here
// import remarkParse from 'remark-parse';

async function runBatch() {
  const { files } = workerData;
  const results = [];

  // Initialize your processor
  const processor = unified().use(/* your plugins */);

  for (const item of files) {
    try {
      // item.tree is the syntax tree, item.file is the vfile/content
      const tree = await processor.run(item.tree, item.file);
      results.push({ success: true, tree });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }

  // Send the processed trees back to the main thread
  parentPort.postMessage(results);
}

function logMemory(step) {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`[MEM] ${step}: ${Math.round(used)} MB`);
}
const core = async () => {
  const { node,  processor} = workerData;
  logMemory(`Before Node`);
  /** @type {HastRoot} */
  const hast = toHast(node);

  const codeElement = hast.children[0]
  if (node.meta && codeElement) {
    codeElement.data = { meta: node.meta };
  }

  /** @type {HastRoot} */
  const rootHast = { type: 'root', children: [hast] };
  try {
    const transformedHast = await processor.run(rootHast);
    parentPort.postMessage(transformedHast);

  } catch (e) {
    logErrorToFile(e)

  }


  //global.gc();
  logMemory(`After Node`);
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Replicate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFilePath = path.join(__dirname, 'error.log');
function logErrorToFile(error) {
    // Append the message to 'error.log'
    fs.appendFile(logFilePath, `${error.message}${error.stack}\n\n`, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
}

await core();