import mongoose from 'mongoose';

/**
 * Ensures a value is a valid string ObjectId, otherwise returns null.
 */
export function safeObjectId(id: any): mongoose.Types.ObjectId | null {
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}

/**
 * Wraps a value in $eq for safe literal matching in MongoDB queries.
 */
export function eq(value: any) {
  return { $eq: value };
}

/**
 * Ensures an array contains only valid string ObjectIds.
 */
export function safeObjectIdArray(ids: any[]): mongoose.Types.ObjectId[] {
  return Array.isArray(ids)
    ? ids.filter(id => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id))
    : [];
}

/**
 * Ensures a value is a string (for search, etc.), otherwise returns ''.
 */
export function safeString(val: any): string {
  return typeof val === 'string' ? val : '';
}

/**
 * Ensures an array of strings (for $in, etc.).
 */
export function safeStringArray(arr: any): string[] {
  return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [];
} 