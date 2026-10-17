/**
 * SpeechNormalizer.ts
 * Bulletproof normalizer for spoken utterances from speech-to-text (Whisper/STT).
 * Handles accents, spoken numbers, spoken email structures, and fuzzy string similarity.
 */

const NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  oh: '0',
  o: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9'
};

const TEENS_AND_TENS: Record<string, string> = {
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19',
  twenty: '20',
  thirty: '30',
  forty: '40',
  fifty: '50',
  sixty: '60',
  seventy: '70',
  eighty: '80',
  ninety: '90'
};

export class SpeechNormalizer {
  /**
   * Normalizes spoken email addresses from speech transcripts.
   * Examples:
   *  - "yuvaraj at gmail dot com" -> "yuvaraj@gmail.com"
   *  - "rahul at the rate gmail dot com" -> "rahul@gmail.com"
   *  - "john dot doe at yahoo dot com" -> "john.doe@yahoo.com"
   *  - "sujeet underscore 98 at outlook dot com" -> "sujeet_98@outlook.com"
   */
  static extractSpokenEmail(rawInput: string): string | null {
    if (!rawInput) return null;

    // Check for standard email notation first
    const directMatch = rawInput.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    if (directMatch) {
      return directMatch[1].toLowerCase();
    }

    // Normalize spoken symbols
    let text = rawInput.toLowerCase();
    text = text.replace(/\b(at the rate|at rate|at the|at)\b/g, '@');
    text = text.replace(/\b(dot|point|period)\b/g, '.');
    text = text.replace(/\b(underscore)\b/g, '_');
    text = text.replace(/\b(hyphen|dash)\b/g, '-');

    // Remove spaces around @ and .
    text = text.replace(/\s*@\s*/g, '@');
    text = text.replace(/\s*\.\s*/g, '.');
    text = text.replace(/\s*_\s*/g, '_');
    text = text.replace(/\s*-\s*/g, '-');

    const spokenMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (spokenMatch) {
      return spokenMatch[1].toLowerCase();
    }

    return null;
  }

  /**
   * Normalizes spoken phone numbers from speech transcripts.
   * Examples:
   *  - "nine eight seven six five four zero one zero two" -> "9876540102"
   *  - "double nine eight seven..." -> "9987..."
   *  - "triple five..." -> "555..."
   *  - "98 76 54 01 02" -> "9876540102"
   */
  static extractSpokenPhone(rawInput: string): string | null {
    if (!rawInput) return null;

    // Check for standard 10 continuous digits first
    const directMatch = rawInput.match(/(?:\+?\d{1,3}[-.\s]?)?([6-9]\d{9})\b/) ||
                        rawInput.match(/\b(\d{10})\b/);
    if (directMatch) {
      return directMatch[1];
    }

    // Convert word numbers into digits
    let tokens = rawInput.toLowerCase().split(/[\s,.-]+/);
    const convertedTokens: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Handle multiplier: "double 9", "triple 5"
      if ((token === 'double' || token === 'twice') && i + 1 < tokens.length) {
        const next = tokens[i + 1];
        const digit = NUMBER_WORDS[next] || (next.length === 1 && /\d/.test(next) ? next : null);
        if (digit) {
          convertedTokens.push(digit, digit);
          i++;
          continue;
        }
      }

      if ((token === 'triple' || token === 'thrice') && i + 1 < tokens.length) {
        const next = tokens[i + 1];
        const digit = NUMBER_WORDS[next] || (next.length === 1 && /\d/.test(next) ? next : null);
        if (digit) {
          convertedTokens.push(digit, digit, digit);
          i++;
          continue;
        }
      }

      if (NUMBER_WORDS[token]) {
        convertedTokens.push(NUMBER_WORDS[token]);
      } else if (TEENS_AND_TENS[token]) {
        convertedTokens.push(TEENS_AND_TENS[token]);
      } else if (/^\d+$/.test(token)) {
        convertedTokens.push(token);
      } else {
        convertedTokens.push(' ');
      }
    }

    // Concatenate consecutive digit sequences
    const fullSequence = convertedTokens.join('');
    const digitSequences = fullSequence.match(/\d{7,15}/g);
    if (digitSequences) {
      for (const seq of digitSequences) {
        if (seq.length === 10) {
          return seq;
        }
        if (seq.length > 10) {
          // If 11 or 12 digits (with country code like 91), extract last 10
          return seq.slice(-10);
        }
      }
    }

    return null;
  }

  /**
   * Normalizes spoken alphanumeric IDs:
   * e.g. "O R D one zero zero two" -> "ORD1002", "order # 1 0 0 2" -> "ORD1002"
   */
  static extractSpokenIdentifier(rawInput: string): string | null {
    if (!rawInput) return null;

    // First check spoken email
    const email = this.extractSpokenEmail(rawInput);
    if (email) return email;

    // Next check spoken phone
    const phone = this.extractSpokenPhone(rawInput);
    if (phone) return phone;

    // Check standard entity prefixes: ORD, INV, TRK, APT, PAT, RES, TKT, CUST, POL
    const prefixMatch = rawInput.match(/\b(ORD|INV|TRK|APT|PAT|RES|TKT|CUST|POL|BK|ID)\s*[-_:#]?\s*([0-9]{2,8})\b/i);
    if (prefixMatch) {
      return `${prefixMatch[1].toUpperCase()}${prefixMatch[2]}`;
    }

    // Check spelled-out prefix: "O R D 1002"
    const spelledMatch = rawInput.match(/\b([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\s*[-_:#]?\s*([0-9]{2,8})\b/i);
    if (spelledMatch) {
      const prefix = `${spelledMatch[1]}${spelledMatch[2]}${spelledMatch[3]}`.toUpperCase();
      return `${prefix}${spelledMatch[4]}`;
    }

    // Check hash notation: #1002
    const hashMatch = rawInput.match(/#\s*([0-9]{3,8})\b/);
    if (hashMatch) {
      return hashMatch[1];
    }

    // Check general explicit id / reference number
    const numMatch = rawInput.match(/\b(?:id|number|reference|code|booking|appointment|ticket|order)\s*(?:is|was|number)?\s*[:#]?\s*([0-9]{3,8})\b/i);
    if (numMatch) {
      return numMatch[1];
    }

    // Check standalone number
    const standalone = rawInput.trim().match(/^([0-9]{3,8})$/);
    if (standalone) {
      return standalone[1];
    }

    // Check spoken name intro
    const nameMatch = rawInput.match(/(?:my name is|name is|i am|this is|under the name of|under|for|check for)\s+([A-Za-z]{2,}(?:\s+[A-Za-z]{2,}){0,2})\b/i);
    if (nameMatch) {
      const candidate = nameMatch[1].trim();
      const forbidden = ['my order', 'the order', 'an order', 'a delivery', 'the status', 'customer service', 'an appointment'];
      if (!forbidden.includes(candidate.toLowerCase()) && candidate.length >= 3) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Calculates Levenshtein distance between two strings.
   */
  static levenshteinDistance(s1: string, s2: string): number {
    const a = s1.toLowerCase();
    const b = s2.toLowerCase();
    const m = a.length;
    const n = b.length;
    const d: number[][] = [];

    for (let i = 0; i <= m; i++) d[i] = [i];
    for (let j = 0; j <= n; j++) d[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,      // deletion
          d[i][j - 1] + 1,      // insertion
          d[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return d[m][n];
  }

  /**
   * Returns similarity ratio between 0.0 and 1.0.
   */
  static stringSimilarity(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;
    const dist = this.levenshteinDistance(s1, s2);
    return 1.0 - dist / maxLen;
  }

  /**
   * Performs accent-tolerant and token-based name matching.
   * e.g. "Yuvraj" matches "Yuvaraj Khot", "Sara" matches "Sarah Connor", "Khot" matches "Yuvaraj Khot"
   */
  static isFuzzyNameMatch(query: string, candidate: string): boolean {
    if (!query || !candidate) return false;

    const q = query.trim().toLowerCase();
    const c = candidate.trim().toLowerCase();

    // 1. Direct equality or substring
    if (q === c || c.includes(q) || q.includes(c)) {
      return true;
    }

    // 2. Token overlap: check if any first or last name matches
    const qTokens = q.split(/\s+/).filter(t => t.length >= 3);
    const cTokens = c.split(/\s+/).filter(t => t.length >= 3);

    for (const qToken of qTokens) {
      for (const cToken of cTokens) {
        if (qToken === cToken) return true;
        // Check spelling tolerance (e.g. "Yuvraj" vs "Yuvaraj", "Sara" vs "Sarah")
        if (Math.abs(qToken.length - cToken.length) <= 2) {
          const sim = this.stringSimilarity(qToken, cToken);
          if (sim >= 0.78) return true;
        }
      }
    }

    // 3. Full string similarity
    if (Math.abs(q.length - c.length) <= 3) {
      const fullSim = this.stringSimilarity(q, c);
      if (fullSim >= 0.80) return true;
    }

    return false;
  }
}
