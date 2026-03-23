import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function optimizeImages() {
  console.log('🖼️ Optimizing images for GitHub...');
  
  const publicDir = path.join(process.cwd(), 'public');
  
  // Optimize logo.png
  const logoPath = path.join(publicDir, 'logo.png');
  const logoOptimizedPath = path.join(publicDir, 'logo-optimized.png');
  
  try {
    await sharp(logoPath)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, quality: 80 })
      .toFile(logoOptimizedPath);
    
    console.log('✅ Logo optimized!');
    
    // Replace original with optimized
    fs.unlinkSync(logoPath);
    fs.renameSync(logoOptimizedPath, logoPath);
    
    const stats = fs.statSync(logoPath);
    console.log(`📊 New size: ${(stats.size / 1024).toFixed(1)} KB`);
  } catch (error) {
    console.error('❌ Error optimizing logo:', error);
  }
}

optimizeImages().catch(console.error);
