import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function removeBackground() {
  console.log('🔄 Processing logo to remove background...');
  
  const logoPath = path.join(process.cwd(), 'public/logo.png');
  const outputPath = path.join(process.cwd(), 'public/logo-transparent-new.png');
  
  try {
    // Get image metadata
    const metadata = await sharp(logoPath).metadata();
    console.log(`📊 Image size: ${metadata.width}x${metadata.height}`);
    
    // Process image to make white/light background transparent
    // This works by detecting near-white pixels and making them transparent
    const { data, info } = await sharp(logoPath)
      .ensureAlpha()  // Ensure alpha channel exists
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const pixels = data;
    const width = info.width;
    const height = info.height;
    const channels = info.channels;
    
    // Process each pixel
    for (let i = 0; i < pixels.length; i += channels) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      
      // Check if pixel is close to white (background)
      // Adjust threshold as needed
      const isWhite = r > 240 && g > 240 && b > 240;
      const isLightGray = r > 220 && g > 220 && b > 220 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
      
      if (isWhite || isLightGray) {
        // Make transparent
        if (channels === 4) {
          pixels[i + 3] = 0; // Set alpha to 0
        }
      }
    }
    
    // Convert back to PNG
    await sharp(pixels, {
      raw: {
        width: width,
        height: height,
        channels: channels as sharp.Channels,
      }
    })
    .png()
    .toFile(outputPath);
    
    console.log('✅ Background removed successfully!');
    console.log(`📁 Saved to: ${outputPath}`);
    
    // Also save as main logo
    fs.copyFileSync(outputPath, path.join(process.cwd(), 'public/logo.png'));
    console.log('✅ Updated main logo file');
    
  } catch (error) {
    console.error('❌ Error processing logo:', error);
    
    // Just use original if processing fails
    console.log('⚠️ Using original logo');
  }
}

removeBackground().catch(console.error);
