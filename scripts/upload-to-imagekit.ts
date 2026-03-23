import ImageKit from 'imagekit';
import fs from 'fs';
import path from 'path';

// ImageKit configuration
const imagekit = new ImageKit({
  publicKey: 'public_Wksh6UwSA7ogAHZPkF8DZNaDMMA=',
  privateKey: 'private_axKYAD+8m9LUQdlR0G/RvTZM4mg=',
  urlEndpoint: 'https://ik.imagekit.io/tarifastore',
});

async function uploadToImageKit(filePath: string, fileName: string): Promise<string | null> {
  try {
    console.log(`📤 Uploading ${fileName} to ImageKit...`);
    
    // Read file as base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64File = fileBuffer.toString('base64');
    
    const result = await imagekit.upload({
      file: `data:image/png;base64,${base64File}`,
      fileName: fileName,
      folder: '/tarifa',
      useUniqueFileName: false,
      overwriteFile: true,
    });
    
    console.log(`✅ Successfully uploaded: ${fileName}`);
    console.log(`   URL: ${result.url}`);
    return result.url;
  } catch (error) {
    console.error(`❌ Error uploading ${fileName}:`, error);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting ImageKit upload...\n');
  
  const publicDir = path.join(process.cwd(), 'public');
  
  // Upload logo
  const logoPath = path.join(publicDir, 'logo.png');
  const logoUrl = await uploadToImageKit(logoPath, 'logo.png');
  
  // Upload favicon
  const faviconPath = path.join(publicDir, 'favicon.png');
  const faviconUrl = await uploadToImageKit(faviconPath, 'favicon.png');
  
  console.log('\n📋 Summary:');
  console.log('='.repeat(50));
  
  if (logoUrl) {
    console.log(`✅ Logo: ${logoUrl}`);
  }
  if (faviconUrl) {
    console.log(`✅ Favicon: ${faviconUrl}`);
  }
  
  // Save URLs to file
  const urls = {
    logo: logoUrl,
    favicon: faviconUrl,
    uploadedAt: new Date().toISOString(),
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), 'uploaded-urls.json'),
    JSON.stringify(urls, null, 2)
  );
  
  console.log('\n💾 URLs saved to uploaded-urls.json');
}

main().catch(console.error);
