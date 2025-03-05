import * as fs from "fs";
import * as path from "path";

const CHUNK_SIZE = 100000; // Number of characters per chunk
const INPUT_FILE = "alchemy-sdk-js.txt";
const OUTPUT_DIR = "split-files";

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Read the input file
const content = fs.readFileSync(INPUT_FILE, "utf-8");

// Split the content into chunks
let chunkIndex = 0;
for (let i = 0; i < content.length; i += CHUNK_SIZE) {
  const chunk = content.slice(i, i + CHUNK_SIZE);

  // Ensure we don't split in the middle of a line
  let endIndex = chunk.lastIndexOf("\n");
  if (endIndex === -1) endIndex = chunk.length;

  const chunkContent = chunk.slice(0, endIndex);

  // Write chunk to a new file
  const outputPath = path.join(
    OUTPUT_DIR,
    `chunk-${String(chunkIndex).padStart(3, "0")}.txt`
  );
  fs.writeFileSync(outputPath, chunkContent);

  // Move the pointer back to not lose any content
  i -= chunk.length - endIndex;
  chunkIndex++;
}

console.log(`Split complete! Created ${chunkIndex} files in ${OUTPUT_DIR}/`);
