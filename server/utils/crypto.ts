import crypto from 'node:crypto';

function getEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || 'realty-messenger-crm-dev-key-32b';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptToken(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptToken(cipherText: string): string {
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function verifyMetaSignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return false;
  const expectedPrefix = 'sha256=';
  if (!signatureHeader.startsWith(expectedPrefix)) return false;
  const receivedHex = signatureHeader.slice(expectedPrefix.length);
  const expectedHex = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  const receivedBuf = Buffer.from(receivedHex, 'hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (receivedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(receivedBuf, expectedBuf);
}
