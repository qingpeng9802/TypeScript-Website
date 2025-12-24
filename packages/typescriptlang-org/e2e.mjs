import { unified } from 'unified';
import remarkParse from 'remark-parse';
import gatsbyPlugin from './plugins/gatsby-remark-shiki/index.mjs';

// The E2E Simulation Function
async function simulateGatsby(markdownContent) {
  // 1. Simulate Gatsby's internal parsing phase
  const processor = unified().use(remarkParse);
  const markdownAST = processor.parse(markdownContent);

  // 2. Run your plugin exactly how Gatsby calls it
  // Gatsby passes an object with the AST
  await gatsbyPlugin({ markdownAST });

  return markdownAST;
}

// --- TEST SCENARIO ---
const input = `
# Project Specs
Check the type of this variable:

\`\`\`ts twoslash {2}
interface Project {
  name: string;
  budget: number;
}
const p: Project = { name: "Apollo", budget: 1000 };
console.log(p.name);
\`\`\`
`;

async function runE2E() {
  console.log("🛠️  Simulating Gatsby Remark Pipeline...");
  
  const resultAST = await simulateGatsby(input);

  // Find the transformed node
  const codeNode = resultAST.children.find(n => n.type === 'html');

  if (codeNode) {
    console.log("✅ Success: Markdown 'code' node converted to 'html' node.");
    
    // Check for "Rich" Twoslash features
    const hasTwoslash = codeNode.value.includes('twoslash-hover');
    const hasHighlight = codeNode.value.includes('line highlighted');
    
    console.log(`📊 Twoslash Active: ${hasTwoslash ? 'YES' : 'NO'}`);
    console.log(`📊 Line Highlights: ${hasHighlight ? 'YES' : 'NO'}`);
    
    // Print a snippet of the final HTML for visual verification
    console.log("\n--- Final HTML Snippet ---");
    console.log(codeNode.value.substring(0, 300) + "...");
  } else {
    throw new Error("Plugin failed to transform the code block.");
  }
}

runE2E().catch(console.error);