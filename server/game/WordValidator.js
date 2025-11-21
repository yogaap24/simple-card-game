import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { ValidationSource } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load local dictionary into a Set for O(1) lookup (as fallback/supplement)
let localDictionary = new Set();
try {
  const wordsPath = join(__dirname, '../../data/kbbi-words.json');
  const words = JSON.parse(readFileSync(wordsPath, 'utf-8'));
  localDictionary = new Set(words.map(w => w.toLowerCase()));
  console.log(`✅ Loaded ${localDictionary.size} words into local dictionary (fallback)`);
} catch (error) {
  console.error('❌ Error loading local dictionary:', error.message);
}

/**
 * Check if a word exists in local dictionary (fallback)
 */
export function validateWithDictionary(word) {
  const normalized = word.toLowerCase().trim();
  return localDictionary.has(normalized);
}

/**
 * Check word using KBBI API (https://kbbi.raf555.dev)
 * This is the primary validation method
 */
export async function validateWithAPI(word) {
  try {
    const apiUrl = 'https://kbbi.raf555.dev/api/v1/entry';
    const normalized = word.toLowerCase().trim();

    const response = await axios.get(`${apiUrl}/${encodeURIComponent(normalized)}`, {
      headers: {
        'accept': 'application/json'
      },
      timeout: 5000
    });

    // Check if word exists in KBBI
    if (response.data && response.data.entries && response.data.entries.length > 0) {
      // Extract useful information
      const firstEntry = response.data.entries[0];
      const definitions = firstEntry.definitions || [];
      const derivedWords = firstEntry.derivedWords || [];
      const compoundWords = firstEntry.compoundWords || [];

      return {
        valid: true,
        lemma: response.data.lemma,
        entry: firstEntry.entry,
        definitions: definitions.map(def => def.definition),
        derivedWords: derivedWords,
        compoundWords: compoundWords,
        fullData: response.data
      };
    }

    return { valid: false, error: 'Word not found in KBBI' };
  } catch (error) {
    // If API fails, log but don't crash
    if (error.response?.status === 404) {
      return { valid: false, error: 'Word not found in KBBI' };
    }
    console.error('KBBI API error:', error.message);
    return { valid: false, error: 'API error: ' + error.message };
  }
}

/**
 * Main validation function with multiple layers
 */
export async function validateWord(word) {
  const normalized = word.toLowerCase().trim();

  // Minimum word length check
  if (normalized.length < 2) {
    return {
      valid: false,
      source: ValidationSource.DICTIONARY,
      message: 'Word too short (minimum 2 characters)'
    };
  }

  // Layer 1: Try KBBI API first (primary validation)
  const apiResult = await validateWithAPI(normalized);
  if (apiResult.valid) {
    // Add to local dictionary for faster future lookups
    localDictionary.add(normalized);

    return {
      valid: true,
      source: ValidationSource.API,
      word: normalized,
      lemma: apiResult.lemma,
      entry: apiResult.entry,
      definitions: apiResult.definitions,
      derivedWords: apiResult.derivedWords,
      compoundWords: apiResult.compoundWords,
      message: `Valid Indonesian word: ${apiResult.lemma}`
    };
  }

  // Layer 2: Check local dictionary as fallback
  const dictionaryValid = validateWithDictionary(normalized);
  if (dictionaryValid) {
    return {
      valid: true,
      source: ValidationSource.DICTIONARY,
      word: normalized,
      message: 'Valid word (from local dictionary)'
    };
  }

  // Layer 3: Word not found - will need challenge system
  return {
    valid: false,
    source: ValidationSource.DICTIONARY,
    word: normalized,
    message: 'Word not found in KBBI or local dictionary'
  };
}

/**
 * Validate if cards can form a valid word
 */
export async function validateCardCombination(cards) {
  if (!cards || cards.length === 0) {
    return {
      valid: false,
      message: 'No cards provided'
    };
  }

  // Combine card values to form word
  const word = cards.map(card => card.value).join('');

  // Validate the formed word
  return await validateWord(word);
}

/**
 * Add a word to the local dictionary (after successful challenge)
 */
export function addWordToDictionary(word) {
  const normalized = word.toLowerCase().trim();
  localDictionary.add(normalized);
  console.log(`✅ Added "${normalized}" to local dictionary`);
  return true;
}

/**
 * Get dictionary size (for statistics)
 */
export function getDictionarySize() {
  return localDictionary.size;
}

export default {
  validateWord,
  validateWithDictionary,
  validateWithAPI,
  validateCardCombination,
  addWordToDictionary,
  getDictionarySize
};

