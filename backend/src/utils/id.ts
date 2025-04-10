import { customAlphabet } from 'nanoid';

// Create a custom ID generator with a custom alphabet and length
export const createId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 21);