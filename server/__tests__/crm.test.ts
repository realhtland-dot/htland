import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { extractVietnamesePhones, normalizeVietnamesePhone } from '../utils/phone.ts';
import { decryptToken, encryptToken, verifyMetaSignature } from '../utils/crypto.ts';
import { markWebhookEventProcessed } from '../services/meta.service.ts';
import { openApiSpec } from '../swagger.ts';

describe('Vietnamese Phone Extraction & Normalization', () => {
  it('normalizes spaces, dots, +84, and 84 prefixes to 0xxxxxxxxx', () => {
    expect(normalizeVietnamesePhone('0987654321')).toBe('0987654321');
    expect(normalizeVietnamesePhone('0987 654 321')).toBe('0987654321');
    expect(normalizeVietnamesePhone('0987.654.321')).toBe('0987654321');
    expect(normalizeVietnamesePhone('+84987654321')).toBe('0987654321');
    expect(normalizeVietnamesePhone('84987654321')).toBe('0987654321');
    expect(normalizeVietnamesePhone('02838221234')).toBe('02838221234');
  });

  it('extracts multiple distinct phones and ignores property prices or areas', () => {
    const message =
      'Mình cần mua đất Củ Chi 150m2 giá tầm 1000000000 hoặc 2.5 tỷ. Số chính 0987.654.321, số zalo +84 912 345 678 hoặc gọi lại 0987 654 321 giúp anh.';
    const result = extractVietnamesePhones(message);

    expect(result.primaryPhone).toBe('0987654321');
    expect(result.phones).toEqual(['0987654321', '0912345678']);
  });

  it('returns null/empty when no valid phone exists instead of hallucinating', () => {
    const result = extractVietnamesePhones('Em gửi anh thông tin lô đất mặt tiền 120m2 giá 2 tỷ 3 nhé.');
    expect(result.primaryPhone).toBeNull();
    expect(result.phones).toEqual([]);
  });
});

describe('Security: AES-256-GCM Token Vault & Meta HMAC Signature', () => {
  it('encrypts and decrypts Page Access Tokens losslessly', () => {
    const rawPageToken = 'EAAZA_test_page_access_token_realty_crm_2026';
    const encrypted = encryptToken(rawPageToken);

    expect(encrypted).not.toContain(rawPageToken);
    expect(encrypted.split(':')).toHaveLength(3);
    expect(decryptToken(encrypted)).toBe(rawPageToken);
  });

  it('verifies valid Meta X-Hub-Signature-256 and rejects tampered payloads', () => {
    const appSecret = 'meta_app_secret_sample_123';
    const rawBody = Buffer.from(JSON.stringify({ object: 'page', entry: [] }), 'utf8');
    const validSig =
      'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

    expect(verifyMetaSignature(rawBody, validSig, appSecret)).toBe(true);
    expect(verifyMetaSignature(Buffer.from('{"tampered":true}'), validSig, appSecret)).toBe(false);
    expect(verifyMetaSignature(rawBody, 'sha256=deadbeef', appSecret)).toBe(false);
    expect(verifyMetaSignature(rawBody, undefined, appSecret)).toBe(false);
  });
});

describe('Meta Webhook Event Deduplication', () => {
  it('processes new event IDs once and rejects duplicate deliveries', () => {
    const eventId = `mid.dedup.${Date.now()}`;
    expect(markWebhookEventProcessed(eventId)).toBe(true);
    expect(markWebhookEventProcessed(eventId)).toBe(false);
  });
});

describe('OpenAPI / Swagger Specification Integrity', () => {
  it('exposes core Facebook, Webhook, AI, and Health endpoints', () => {
    const paths = Object.keys(openApiSpec.paths);
    expect(paths).toContain('/health');
    expect(paths).toContain('/facebook/oauth');
    expect(paths).toContain('/webhooks/meta');
    expect(paths).toContain('/ai/analyze');
    expect(paths).toContain('/phones/extract');
  });
});
