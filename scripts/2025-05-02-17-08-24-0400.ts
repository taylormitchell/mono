#!/usr/bin/env bun

/**
 * This script is used to run the mitmweb proxy with the AuthorizePopUp file.
 */
import {$} from 'bun';

async function main() {
  console.log('Start');

  //   console.log('Building the pay engine...');
  //   await $`yarn build:production:pay`;

  console.log('Finding AuthorizePopUp file in the build output...');

  let file = '';
  try {
    // Get all files in the assets directory
    const files =
      await $`find engines/pay/public/pay/vite-dev-pay/assets -type f`.text();

    // Split the output into lines
    const fileList = files.split('\n').filter(Boolean);

    // Find files that contain "AuthorizePopUp"
    const authorizePopUpFiles = fileList.filter((file) =>
      file.includes('AuthorizePopUp'),
    );

    if (authorizePopUpFiles.length > 0) {
      file = authorizePopUpFiles[0];
    } else {
      console.log('No AuthorizePopUp files found');
    }
  } catch (error) {
    console.error('Error finding AuthorizePopUp file:', error);
  }

  const url = `http://127.0.0.1:1234/${file}`;
  console.log('Starting mitmweb with URL:', url);
  await $`cd /Users/taylormitchell/src/github.com/Shopify/shop-pay-for-ccs-team/utils/mitmproxy && ./system_proxy on && mitmweb --map-remote "=https://cdn.shopify.com/shopifycloud/arrive-server/pay/vite-pay/assets/AuthorizePopUp-DXVYTTeh.js=${url}"`;
}

// Run the main function
main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
