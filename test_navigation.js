#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

async function testNavigation() {
  console.log('Testing Mobile Navigation and Screenshots...\n');
  
  // Set environment variables
  process.env.APPIUM_URL = 'http://127.0.0.1:4723';
  process.env.IOS_DEVICE_NAME = 'iPhone 16 Plus';
  process.env.IOS_APP = '/Users/ricardocastro/git/nutridose/nutridose_flutter/build/ios/iphonesimulator/Runner.app';
  process.env.IOS_BUNDLE_ID = 'com.nutridose.app';
  
  // Import the modules
  const Appium = await import('./dist/appiumClient.js');
  
  const cfg = {
    appiumUrl: process.env.APPIUM_URL,
    deviceName: process.env.IOS_DEVICE_NAME,
    platformVersion: process.env.IOS_PLATFORM_VERSION,
    app: process.env.IOS_APP,
    bundleId: process.env.IOS_BUNDLE_ID
  };
  
  // Create screenshots directory
  const screenshotsDir = '/Users/ricardocastro/git/nutridose/mobile-agent-mcp/screenshots';
  await fs.mkdir(screenshotsDir, { recursive: true });
  
  try {
    console.log('1. Establishing Appium session...');
    await Appium.ensureSession(cfg);
    console.log('✅ Session established\n');
    
    console.log('2. Launching NutriDose app...');
    await Appium.launchApp(cfg, 'com.nutridose.app');
    console.log('✅ App launched\n');
    
    // Wait for app to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('3. Taking screenshot of initial screen...');
    const screenshot1 = await Appium.screenshot(cfg);
    await fs.writeFile(
      path.join(screenshotsDir, '01_initial_screen.png'),
      Buffer.from(screenshot1, 'base64')
    );
    console.log('✅ Saved: 01_initial_screen.png\n');
    
    console.log('4. Getting UI source to understand current screen...');
    const source = await Appium.getSource(cfg);
    
    // Check what screen we're on
    if (source.includes('Dashboard') || source.includes('Daily Summary')) {
      console.log('📱 Currently on: Dashboard\n');
      
      // Try to navigate to different sections
      console.log('5. Attempting to tap Food section...');
      try {
        // Try tapping at approximate food button location (bottom nav)
        await Appium.tap(cfg, { x: 107, y: 850 }); // Approximate position for Food tab
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const screenshot2 = await Appium.screenshot(cfg);
        await fs.writeFile(
          path.join(screenshotsDir, '02_food_screen.png'),
          Buffer.from(screenshot2, 'base64')
        );
        console.log('✅ Saved: 02_food_screen.png\n');
      } catch (e) {
        console.log('⚠️ Could not navigate to Food screen:', e.message);
      }
      
      console.log('6. Attempting to tap Exercise section...');
      try {
        // Try tapping at approximate exercise button location
        await Appium.tap(cfg, { x: 215, y: 850 }); // Approximate position for Exercise tab
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const screenshot3 = await Appium.screenshot(cfg);
        await fs.writeFile(
          path.join(screenshotsDir, '03_exercise_screen.png'),
          Buffer.from(screenshot3, 'base64')
        );
        console.log('✅ Saved: 03_exercise_screen.png\n');
      } catch (e) {
        console.log('⚠️ Could not navigate to Exercise screen:', e.message);
      }
      
      console.log('7. Attempting to tap More/Profile section...');
      try {
        // Try tapping at approximate more button location
        await Appium.tap(cfg, { x: 387, y: 850 }); // Approximate position for More tab
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const screenshot4 = await Appium.screenshot(cfg);
        await fs.writeFile(
          path.join(screenshotsDir, '04_more_screen.png'),
          Buffer.from(screenshot4, 'base64')
        );
        console.log('✅ Saved: 04_more_screen.png\n');
      } catch (e) {
        console.log('⚠️ Could not navigate to More screen:', e.message);
      }
      
    } else if (source.includes('Login') || source.includes('Email') || source.includes('Password')) {
      console.log('📱 Currently on: Login Screen\n');
      
      const screenshotLogin = await Appium.screenshot(cfg);
      await fs.writeFile(
        path.join(screenshotsDir, '00_login_screen.png'),
        Buffer.from(screenshotLogin, 'base64')
      );
      console.log('✅ Saved: 00_login_screen.png\n');
      
      console.log('ℹ️ App is on login screen. Please login manually to proceed with navigation test.\n');
    } else {
      console.log('📱 Current screen is unknown. Analyzing UI source...\n');
      
      // Save the source for debugging
      await fs.writeFile(
        path.join(screenshotsDir, 'ui_source.xml'),
        source
      );
      console.log('✅ Saved UI source to ui_source.xml for analysis\n');
    }
    
    console.log('8. Testing swipe gesture...');
    try {
      await Appium.swipe(cfg, { direction: 'up', distance: 300 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const screenshot5 = await Appium.screenshot(cfg);
      await fs.writeFile(
        path.join(screenshotsDir, '05_after_swipe.png'),
        Buffer.from(screenshot5, 'base64')
      );
      console.log('✅ Saved: 05_after_swipe.png\n');
    } catch (e) {
      console.log('⚠️ Swipe gesture failed:', e.message);
    }
    
    console.log('\n🎉 Navigation test complete!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
    console.log('\nScreenshots captured:');
    const files = await fs.readdir(screenshotsDir);
    files.filter(f => f.endsWith('.png')).forEach(f => {
      console.log(`  - ${f}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testNavigation().catch(console.error);