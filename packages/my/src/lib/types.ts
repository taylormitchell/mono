import { Command } from 'commander';

/**
 * A function that registers a command with the program
 */
export type CommandRegistration = (program: Command) => void;

/**
 * Command result interface
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: Error;
}

/**
 * Generic options for commands
 */
export interface BaseOptions {
  [key: string]: any;
  verbose?: boolean;
}

/**
 * File information type
 */
export interface FileInfo {
  path: string;
  name: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
}

/**
 * Note information
 */
export interface NoteInfo {
  path: string;
  title: string;
  date: Date;
  content?: string;
}

// Add more types as needed