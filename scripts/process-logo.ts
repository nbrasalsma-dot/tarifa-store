import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

async function processLogo() {
  console.log('🔄 Processing logo and favicon...');
  
  const zai = await ZAI.create();
  
  // Read logo image
  const logoPath = path.join(process.cwd(), 'upload/الشعار(1).png');
  const iconPath = path.join(process.cwd(), 'upload/الايقونة.png');
  
  const publicDir = path.join(process.cwd(), 'public');
  
  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // Copy icon/favicon as-is
  if (fs.existsSync(iconPath)) {
    const iconBuffer = fs.readFileSync(iconPath);
    fs.writeFileSync(path.join(publicDir, 'favicon.png'), iconBuffer);
    console.log('✅ Favicon copied successfully!');
  }
  
  // Process logo to remove background
  if (fs.existsSync(logoPath)) {
    console.log('📷 Processing logo to remove background...');
    
    try {
      // Read logo and convert to base64
      const logoBuffer = fs.readFileSync(logoPath);
      const base64Logo = logoBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Logo}`;
      
      // Edit image to remove background
      const response = await zai.images.generations.edit({
        prompt: 'Remove the background completely, make it transparent, keep the logo text and design exactly as is, professional product logo with transparent background',
        images: [{ url: dataUrl }],
        size: '1024x1024'
      });
      
      const imageBase64 = response.data[0].base64;
      const processedBuffer = Buffer.from(imageBase64, 'base64');
      
      // Save processed logo
      fs.writeFileSync(path.join(publicDir, 'logo.png'), processedBuffer);
      console.log('✅ Logo processed and saved with transparent background!');
      
    } catch (error) {
      console.error('❌ Error processing logo:', error);
      // Fallback: copy original logo
      fs.copyFileSync(logoPath, path.join(publicDir, 'logo.png'));
      console.log('⚠️ Using original logo (background removal failed)');
    }
  }
  
  console.log('\n🎉 Logo processing complete!');
  console.log(`- Logo: ${path.join(publicDir, 'logo.png')}`);
  console.log(`- Favicon: ${path.join(publicDir, 'favicon.png')}`);
}

processLogo().catch(console.error);
