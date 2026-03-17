import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const HASH_ALGORITHM = "scrypt";
const KEY_LENGTH = 64;

export async function hashPassword(plainText: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(plainText, salt, KEY_LENGTH)) as Buffer;

  return `${HASH_ALGORITHM}$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(plainText: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, hexHash] = storedHash.split("$");
  if (!algorithm || !salt || !hexHash || algorithm !== HASH_ALGORITHM) {
    return false;
  }

  const expectedBuffer = Buffer.from(hexHash, "hex");
  const calculatedBuffer = (await scryptAsync(plainText, salt, expectedBuffer.length)) as Buffer;

  if (expectedBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, calculatedBuffer);
}
