/*setInterval(() => {
  const usage = process.memoryUsage();
  const timestamp = new Date().toLocaleTimeString();
  
  // RSS is the total memory the OS gave to the process
  // HeapUsed is what's actually in your JS objects
  // External is often where Gatsby hides Buffers/Images
  console.log(`
  [${timestamp}] ------------------------------------------
  RSS:      ${(usage.rss / 1024 / 1024).toFixed(2)} MB (Total Process)
  Heap:     ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB
  External: ${(usage.external / 1024 / 1024).toFixed(2)} MB (Buffers/C++)
  ---------------------------------------------------------
  `);
}, 5000); // Check every 5 seconds
*/
const v8 = require('v8');

function printMemoryStats() {
    const heapStats = v8.getHeapStatistics();
    const heapSpaceStats = v8.getHeapSpaceStatistics();
    const timestamp = new Date().toLocaleTimeString();

    console.log(`[${timestamp}] ------------------------------------------`)
    console.log('    --- Heap Stats ---');
    console.log(`    Total Heap: ${(heapStats.total_heap_size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`    Used Heap: ${(heapStats.used_heap_size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`    External (Buffers): ${(v8.getHeapStatistics().external_memory / 1024 / 1024).toFixed(2)} MB`);

    heapSpaceStats.forEach(space => {
        console.log(`    ${space.space_name}: ${(space.space_used_size / 1024 / 1024).toFixed(2)} MB`);
    });
    console.log(`------------------------------------------`)
}

setInterval(printMemoryStats, 5000);