/**
 * Maps spoken number words to their numeric digit equivalents.
 */
const wordToDigitMap: Record<string, string> = {
  // Indonesian digits
  'nol': '0',
  'satu': '1',
  'dua': '2',
  'tiga': '3',
  'empat': '4',
  'lima': '5',
  'enam': '6',
  'tujuh': '7',
  'delapan': '8',
  'sembilan': '9',
  
  // English digits
  'zero': '0',
  'one': '1',
  'two': '2',
  'three': '3',
  'four': '4',
  'five': '5',
  'six': '6',
  'seven': '7',
  'eight': '8',
  'nine': '9',
  
  // Decimal separators
  'koma': '.',
  'point': '.',
  
  // Negative
  'minus': '-',
  'negatif': '-',
  'negative': '-'
};

/**
 * Converts common spoken number words in a transcript string to their numeric digit representation.
 * Supports Indonesian, English, decimal separators, negatives, and multi-digit spoken numbers.
 * Already-numeric strings are passed through unchanged.
 * 
 * @param transcript Raw or cleaned speech recognition transcript text.
 * @returns Converted numeric string.
 */
export function spokenNumberToDigit(transcript: string): string {
  if (!transcript) return '';

  const normalized = transcript.trim().toLowerCase();
  const tokens = normalized.split(/\s+/);
  
  const mappedTokens = tokens.map(token => {
    // Strip leading/trailing non-alphanumeric punctuation, but keep dots and minus signs.
    const cleanWord = token
      .replace(/^[^a-z0-9.\-]+/, '')
      .replace(/[^a-z0-9.\-]+$/, '');
    
    if (wordToDigitMap[cleanWord] !== undefined) {
      return wordToDigitMap[cleanWord];
    }
    return cleanWord;
  }).filter(t => t !== '');

  return mappedTokens.join('');
}
