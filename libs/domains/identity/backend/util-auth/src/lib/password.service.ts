import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Service for password hashing and verification.
 * Uses bcrypt for secure password hashing.
 */
@Injectable()
export class PasswordService {
  private readonly saltRounds = 10;

  /**
   * Hash a plain text password.
   * @param password - The plain text password to hash
   * @returns The hashed password
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify a plain text password against a hash.
   * @param password - The plain text password to verify
   * @param hash - The hashed password to compare against
   * @returns True if password matches, false otherwise
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}
