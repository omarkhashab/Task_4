import http from 'http';
import mongoose from 'mongoose';
import crypto from 'crypto';

import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Perk } from '../src/models/Perk.js';

async function startHttpServer() {
  return new Promise((resolve) => {
    const instance = http.createServer(app);
    instance.listen(0, () => resolve(instance));
  });
}

describe('Perk controller integration', () => {
  const uniqueSuffix = crypto.randomUUID();
  const credentials = {
    name: `Perk Runner ${uniqueSuffix}`,
    email: `perk.runner.${uniqueSuffix}@example.com`,
    password: `Run-P3rk-${uniqueSuffix.slice(0, 8)}`
  };

  const perkPrototype = {
    title: `Jest Created Benefit ${uniqueSuffix}`,
    description: 'End-to-end test record to verify create/list flows.',
    category: 'food',
    merchant: `Merchant-${uniqueSuffix.slice(0, 6)}`,
    discountPercent: 25
  };

  let serverInstance;
  let baseUrl;
  let authToken;
  let authUserId;
  let recordedPerkId;

  beforeAll(async () => {
    await connectDB();
    await User.deleteOne({ email: credentials.email.toLowerCase() });
    await Perk.deleteMany({ merchant: perkPrototype.merchant });

    serverInstance = await startHttpServer();
    const { port } = serverInstance.address();
    baseUrl = `http://127.0.0.1:${port}/api`;

    // Register the dedicated test user and collect a token for authenticated routes.
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const registerPayload = await registerResponse.json();
    if (registerResponse.status !== 201) {
      throw new Error(`Failed to prepare test user: ${registerPayload?.message || registerResponse.status}`);
    }
    authToken = registerPayload.token;
    authUserId = registerPayload.user.id;
  });

  afterAll(async () => {
    await Perk.deleteMany({ merchant: perkPrototype.merchant });
    await User.deleteOne({ email: credentials.email.toLowerCase() });

    await new Promise((resolve) => serverInstance.close(resolve));
    await mongoose.connection.close();
  });

  test('creates a perk tied to the authenticated user', async () => {
    const response = await fetch(`${baseUrl}/perks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(perkPrototype)
    });

    const payload = await response.json();

    // A successful creation should echo the title and associate the record with
    // the authenticated user id.
    expect(response.status).toBe(201);
    expect(payload.perk.title).toBe(perkPrototype.title);
    expect(payload.perk.createdBy.toString()).toBe(authUserId);

    recordedPerkId = payload.perk._id;
  });

  
  test('lists perks belonging to the current user in reverse chronological order', async () => {
    // Create a follow-up perk so we can observe ordering behaviour.
    const moreRecentTitle = `${perkPrototype.title} v2`;
    const creationResponse = await fetch(`${baseUrl}/perks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...perkPrototype, title: moreRecentTitle })
    });
    const creationPayload = await creationResponse.json();
    expect(creationResponse.status).toBe(201);

    const response = await fetch(`${baseUrl}/perks`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const payload = await response.json();

    // The most recent perk should be first while older entries remain present.
    expect(response.status).toBe(200);
    const titles = payload.perks.map((p) => p.title);
    expect(titles[0]).toBe(moreRecentTitle);
    expect(titles).toContain(perkPrototype.title);

    // Remember the most recent perk so it can be removed later.
    recordedPerkId = creationPayload.perk._id;
  });

  test('returns detailed information for a specific perk', async () => {
    const response = await fetch(`${baseUrl}/perks/${recordedPerkId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const payload = await response.json();

    // Fetching by id should surface the exact document that was just created.
    expect(response.status).toBe(200);
    expect(payload.perk._id).toBe(recordedPerkId);
    expect(payload.perk.merchant).toBe(perkPrototype.merchant);
  });

  test('updates the perk with new values while keeping validation intact', async () => {
    const response = await fetch(`${baseUrl}/perks/${recordedPerkId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ discountPercent: 40, category: 'tech' })
    });

    const payload = await response.json();

    // The patched fields should reflect the latest values while other data is
    // preserved by the controller logic.
    expect(response.status).toBe(200);
    expect(payload.perk.discountPercent).toBe(40);
    expect(payload.perk.category).toBe('tech');
  });

  test('deletes the perk and removes it from subsequent listings', async () => {
    const deleteResponse = await fetch(`${baseUrl}/perks/${recordedPerkId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const deletePayload = await deleteResponse.json();
    expect(deleteResponse.status).toBe(200);
    expect(deletePayload.ok).toBe(true);

    const response = await fetch(`${baseUrl}/perks`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const payload = await response.json();

    // After deletion the identifier must no longer be present in the listing.
    const exists = payload.perks.some((perk) => perk._id === recordedPerkId);
    expect(exists).toBe(false);
  });
});
