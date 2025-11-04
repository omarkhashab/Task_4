import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensure every integration spec has a generous timeout because we are
// performing real network and database work against the live cluster.
jest.setTimeout(60000);

// Load environment variables from the server's .env file if they are present.
// Using fileURLToPath keeps the resolution correct when Jest runs through ESM.
const currentFilePath = fileURLToPath(import.meta.url);
const envPath = path.resolve(path.dirname(currentFilePath), '../.env');
dotenv.config({ path: envPath, override: false });

// The controllers rely on process.env.JWT_SECRET being defined. The production
// code already uses this, so here we provide a safe default for test runs while
// still respecting any value supplied by the user.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'integration-test-secret';
}

// Tests must talk to the live MongoDB cluster per the requirements. Failing
// early with a descriptive message makes configuration mistakes obvious.
if (!process.env.MONGO_URI) {
  throw new Error(
    'Integration tests require MONGO_URI to be configured. Set it in server/.env or export it before running the suite.'
  );
}

process.env.NODE_ENV = 'test';
