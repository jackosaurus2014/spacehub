/**
 * Build TWA using @bubblewrap/core directly, bypassing interactive CLI
 */
const path = require('path');
const fs = require('fs');

async function build() {
  const { TwaManifest } = await import('@bubblewrap/core/dist/lib/TwaManifest.js');
  const { TwaGenerator } = await import('@bubblewrap/core/dist/lib/TwaGenerator.js');
  const { AndroidSdkTools } = await import('@bubblewrap/core/dist/lib/androidSdk/AndroidSdkTools.js');
  const { JdkHelper } = await import('@bubblewrap/core/dist/lib/jdk/JdkHelper.js');
  const { GradleWrapper } = await import('@bubblewrap/core/dist/lib/GradleWrapper.js');
  const { ConsoleLog } = await import('@bubblewrap/core/dist/lib/Log.js');

  const projectDir = __dirname;
  const manifestPath = path.join(projectDir, 'twa-manifest.json');
  const log = new ConsoleLog('build-twa');

  console.log('Loading TWA manifest...');
  const twaManifest = await TwaManifest.fromFile(manifestPath);

  const jdkPath = 'C:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot';
  const androidSdkPath = 'C:\\Users\\Jay\\.bubblewrap\\android-sdk';

  console.log(`JDK: ${jdkPath}`);
  console.log(`Android SDK: ${androidSdkPath}`);

  // Create config object matching what AndroidSdkTools expects
  const config = { androidSdkPath };
  const jdkHelper = new JdkHelper(process, jdkPath);
  const androidSdkTools = await AndroidSdkTools.create(process, config, jdkHelper, log);

  console.log('Generating TWA project...');
  const twaGenerator = new TwaGenerator();
  await twaGenerator.createTwaProject(projectDir, twaManifest, log);

  console.log('Project generated. Building with Gradle...');
  const gradleWrapper = new GradleWrapper(process, androidSdkTools, projectDir);

  const signingKey = {
    path: path.resolve(projectDir, 'spacenexus.keystore'),
    alias: 'spacenexus',
  };

  try {
    await gradleWrapper.bundleRelease(
      signingKey,
      'spacenexus2026',
      'spacenexus2026',
    );
    console.log('\n=== BUILD SUCCESSFUL ===');

    const aabPath = path.join(projectDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
    if (fs.existsSync(aabPath)) {
      const stats = fs.statSync(aabPath);
      console.log(`AAB file: ${aabPath}`);
      console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
  } catch (err) {
    console.error('Build failed:', err.message || err);

    // Try APK as fallback
    try {
      console.log('\nTrying APK build instead...');
      await gradleWrapper.assembleRelease(
        signingKey,
        'spacenexus2026',
        'spacenexus2026',
      );
      console.log('APK build successful!');
    } catch (err2) {
      console.error('APK build also failed:', err2.message || err2);
      process.exit(1);
    }
  }
}

build().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
