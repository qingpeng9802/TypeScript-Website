// test-shiki.mjs
import plugin from './plugins/gatsby-remark-shiki/index.mjs';

// 1. Mock the markdownAST Gatsby would give you
const mockAST = {
  type: 'root',
  children: [
    {
      type: 'code',
      lang: 'ts',
      meta: 'twoslash',
      value: `interface User { name: string }\nconst u: User = { name: "Gemini" };\nconsole.log(u.name);`
    }
  ]
};

async function runTest() {
  console.log('--- Original AST Node ---');
  console.log(mockAST.children[0]);

  // 2. Run your plugin
  await plugin({ markdownAST: mockAST });

  console.log('\n--- Processed HTML Output ---');
  console.log(mockAST.children[0].value);
}

runTest().catch(console.error);