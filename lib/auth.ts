import { verifyMessage } from 'ethers'

export interface AuthSession {
  address: string
  signature: string
  message: string
  timestamp: number
  expiresAt: number
}

export interface SignedMessage {
  message: string
  signature: string
  address: string
}

// Generate authentication message
export function generateAuthMessage(address: string): string {
  const timestamp = Date.now()
  return `Welcome to Morbius.io!

Click to sign in and access your account.

Address: ${address}
Timestamp: ${timestamp}
Expires: ${timestamp + (24 * 60 * 60 * 1000)}` // 24 hours
}

// Verify signature
export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recoveredAddress = verifyMessage(message, signature)
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

// Check if session is valid
export function isSessionValid(session: AuthSession | null): boolean {
  if (!session) return false

  const now = Date.now()
  if (now > session.expiresAt) return false

  return verifySignature(session.message, session.signature, session.address)
}

// Create session from signed message
export function createSession(signedMessage: SignedMessage): AuthSession {
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000) // 24 hours

  return {
    address: signedMessage.address,
    signature: signedMessage.signature,
    message: signedMessage.message,
    timestamp: Date.now(),
    expiresAt
  }
}

// Local storage keys
export const AUTH_STORAGE_KEY = 'morbius-auth-session'

// Save session to localStorage
export function saveSession(session: AuthSession): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  } catch (error) {
    console.error('Failed to save auth session:', error)
  }
}

// Load session from localStorage
export function loadSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) return null

    const session: AuthSession = JSON.parse(stored)

    // Validate session
    if (!isSessionValid(session)) {
      clearSession()
      return null
    }

    return session
  } catch (error) {
    console.error('Failed to load auth session:', error)
    clearSession()
    return null
  }
}

// Clear session
export function clearSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear auth session:', error)
  }
}