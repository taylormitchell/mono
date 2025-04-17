#!/usr/bin/env bun

import { readFileSync } from 'fs';

interface Item {
  text: string;
  tags: string[];
}

function parseMarkdown(content: string): Item[] {
  const lines = content.split('\n');
  const items: Item[] = [];
  const currentTags: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Process headings (add as tags)
    if (line.startsWith('#')) {
      // Count the number of # to determine heading level
      const headingLevel = line.match(/^#+/)?.[0].length || 0;
      const headingText = line.replace(/^#+\s*/, '').trim();
      
      // Update tags based on heading level
      // Remove any existing tags at this level or deeper
      while (currentTags.length >= headingLevel) {
        currentTags.pop();
      }
      
      // Add the new heading tag
      if (headingText) {
        currentTags.push(headingText);
      }
    } 
    // Process bullet points
    else if (line.startsWith('-')) {
      const itemText = line.substring(1).trim();
      if (itemText) {
        items.push({
          text: itemText,
          tags: [...currentTags]
        });
      }
    }
  }

  return items;
}

function filterItems(items: Item[], filterTags: string[]): Item[] {
  if (filterTags.length === 0) {
    return items;
  }
  
  return items.filter(item => {
    return filterTags.every(filterTag => {
      const lowercaseFilterTag = filterTag.toLowerCase();
      return item.tags.some(tag => tag.toLowerCase() === lowercaseFilterTag);
    });
  });
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: bun 2025-04-07-10-00-47-0400.ts <markdown-file> [filter-tags...]');
    process.exit(1);
  }
  
  const filePath = args[0];
  const filterTags = args.slice(1);
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const items = parseMarkdown(content);
    const filteredItems = filterItems(items, filterTags);
    
    filteredItems.forEach(item => {
      console.log(`- ${item.text} [${item.tags.join(' > ')}]`);
    });
    
    if (filteredItems.length === 0) {
      console.log(`No items found matching tags: ${filterTags.join(', ')}`);
    }
  } catch (error) {
    console.error(`Error processing file: ${error.message}`);
    process.exit(1);
  }
}

main();