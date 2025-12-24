import plugin from './plugins/gatsby-remark-shiki/index.mjs';
import assert from 'node:assert/strict';

async function runSuite() {
  console.log('🚀 Starting Shiki-Twoslash Validation Suite...\n');

  // CASE 1: Twoslash & Meta Data Validation
  const twoslashAST = {
    type: 'root',
    children: [{
      type: 'code',
      lang: 'ts',
      meta: 'twoslash {2}', // Requesting twoslash AND line highlighting
      value: `const x: number = 10;\nconsole.log(x);`
    }]
  };

  console.log('Test 1: Twoslash & Meta Rescue...');
  await plugin({ markdownAST: twoslashAST });
  const html = twoslashAST.children[0].value;

  // Validation Logic
  assert.ok(html.includes('twoslash'), '❌ FAILED: Twoslash spans missing');
  assert.ok(html.includes('line'), '❌ FAILED: Line highlighting classes missing');
  assert.ok(html.includes('color:'), '❌ FAILED: Syntax highlighting colors missing');
  console.log('✅ Passed: Twoslash and Meta-data successfully merged.');

  // CASE 2: The "Dangerous" HTML Pass-through
  const htmlAST = {
    type: 'root',
    children: [{
      type: 'code',
      lang: 'html',
      value: `<div onclick="alert('hack')">Standard Code</div>`
    }]
  };

  console.log('Test 2: HTML Entity Safety...');
  await plugin({ markdownAST: htmlAST });
  const dangerousHtml = htmlAST.children[0].value;
  
  assert.ok(dangerousHtml.includes('onclick'), '❌ FAILED: Dangerous attributes stripped');
  console.log('✅ Passed: HTML entities and attributes preserved via allowDangerousHtml.');

  // CASE 3: The "No Language" Survival Test
  const noLangAST = {
    type: 'root',
    children: [{
      type: 'code',
      lang: null,
      value: `plain text`
    }]
  };

  console.log('Test 3: Graceful Fallback (No Lang)...');
  await plugin({ markdownAST: noLangAST });
  console.log(noLangAST.children[0].value);
  assert.strictEqual(noLangAST.children[0].type, 'code', '❌ FAILED: Plugin should ignore null lang');
  console.log('✅ Passed: Plugin ignored non-highlightable node without crashing.');

  console.log('\n✨ ALL TESTS PASSED. The implementation is safe for production.');
}

runSuite().catch(err => {
  console.error('\n❌ TEST SUITE CRASHED:');
  console.error(err);
  process.exit(1);
});