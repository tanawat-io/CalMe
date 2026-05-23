const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join('C:', 'Users', 'Administrator', '.gemini', 'antigravity', 'brain', 'b32dd03e-d092-4b53-a8e6-169cbe5ba2a1', 'rich_menu_button_1779528613525.png');
const outputPath = path.join('C:', 'Users', 'Administrator', '.gemini', 'antigravity', 'brain', 'b32dd03e-d092-4b53-a8e6-169cbe5ba2a1', 'rich_menu_button_2500x1686.png');

async function resize() {
  try {
    if (!fs.existsSync(inputPath)) {
      console.error(`Input file not found at: ${inputPath}`);
      return;
    }
    
    console.log(`Resizing ${inputPath} to 2500x1686 pixels...`);
    await sharp(inputPath)
      .resize(2500, 1686, {
        fit: 'fill' // Force exact dimensions
      })
      .toFile(outputPath);
      
    console.log(`Resized image successfully saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error resizing image:', error);
  }
}

resize();
