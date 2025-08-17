#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testMobileTools() {
  console.log('Testing mobile MCP tools...\n');
  
  // Set environment variables
  process.env.APPIUM_URL = 'http://127.0.0.1:4723';
  process.env.IOS_DEVICE_NAME = 'iPhone 16 Plus';
  process.env.IOS_APP = '/Users/ricardocastro/git/nutridose/nutridose_flutter/build/ios/iphonesimulator/Runner.app';
  process.env.IOS_BUNDLE_ID = 'com.nutridose.app';
  
  // Import the server modules
  const { getConfig } = await import('./dist/index.js');
  const Appium = await import('./dist/appiumClient.js');
  
  const cfg = {
    appiumUrl: process.env.APPIUM_URL || 'http://127.0.0.1:4723',
    deviceName: process.env.IOS_DEVICE_NAME || 'iPhone 16 Plus',
    platformVersion: process.env.IOS_PLATFORM_VERSION,
    app: process.env.IOS_APP,
    bundleId: process.env.IOS_BUNDLE_ID
  };
  
  try {
    console.log('1. Testing Appium connection...');
    await Appium.ensureSession(cfg);
    console.log('✅ Appium session established\n');
    
    console.log('2. Launching app...');
    await Appium.launchApp(cfg, 'com.nutridose.app');
    console.log('✅ App launched\n');
    
    // Wait a bit for app to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('3. Taking screenshot...');
    const screenshot = await Appium.screenshot(cfg);
    console.log(`✅ Screenshot captured (${screenshot.length} bytes base64)\n`);
    
    console.log('4. Getting UI source...');
    const source = await Appium.getSource(cfg);
    console.log(`✅ UI source retrieved (${source.length} characters)\n`);
    
    // Check if we're on login screen
    if (source.includes('Login') || source.includes('Email')) {
      console.log('5. App is on login screen - looking for UI elements...');
      const hasEmail = source.includes('Email') || source.includes('email');
      const hasPassword = source.includes('Password') || source.includes('password');
      console.log(`   - Email field: ${hasEmail ? '✅' : '❌'}`);
      console.log(`   - Password field: ${hasPassword ? '✅' : '❌'}`);
    }
    
    console.log('\n🎉 All tests passed! Mobile MCP is working correctly.\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testMobileTools().catch(console.error);