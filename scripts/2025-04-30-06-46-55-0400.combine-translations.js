#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const buttonTranslationsPath = path.join(
  __dirname,
  '../src/features/ShopPayPaymentRequest/components/ShopPayPaymentRequestButton/translations'
);
const overlayTranslationsPath = path.join(
  __dirname,
  '../src/features/ShopPayPaymentRequest/components/ShopPayPaymentRequestOverlay/translations'
);
const destinationPath = path.join(
  __dirname,
  '../src/features/ShopPayPaymentRequest/components/translations'
);

// Create destination directory if it doesn't exist
if (!fs.existsSync(destinationPath)) {
  fs.mkdirSync(destinationPath, { recursive: true });
}

// Get all translation files from both directories
const buttonFiles = fs.readdirSync(buttonTranslationsPath);
const overlayFiles = fs.readdirSync(overlayTranslationsPath);

// Get a unique list of all language files
const allLanguages = new Set([...buttonFiles, ...overlayFiles]);

// Process each language file
allLanguages.forEach(file => {
  if (!file.endsWith('.json')) return;

  // Read button translations if they exist
  let buttonTranslations = {};
  const buttonFilePath = path.join(buttonTranslationsPath, file);
  if (fs.existsSync(buttonFilePath)) {
    try {
      buttonTranslations = JSON.parse(fs.readFileSync(buttonFilePath, 'utf8'));
    } catch (error) {
      console.error(`Error reading button translations for ${file}:`, error);
    }
  }

  // Read overlay translations if they exist
  let overlayTranslations = {};
  const overlayFilePath = path.join(overlayTranslationsPath, file);
  if (fs.existsSync(overlayFilePath)) {
    try {
      overlayTranslations = JSON.parse(fs.readFileSync(overlayFilePath, 'utf8'));
    } catch (error) {
      console.error(`Error reading overlay translations for ${file}:`, error);
    }
  }

  // Merge translations
  const mergedTranslations = {
    ...buttonTranslations,
    ...overlayTranslations
  };

  // Write merged translations to destination
  const destFilePath = path.join(destinationPath, file);
  try {
    fs.writeFileSync(destFilePath, JSON.stringify(mergedTranslations, null, 2));
    console.log(`Successfully merged translations for ${file}`);
  } catch (error) {
    console.error(`Error writing merged translations for ${file}:`, error);
  }
});

console.log('Finished combining translations!');
