// On-screen text can mark words with *asterisks*; the look decides how they stand out.
export type Word = { readonly text: string; readonly strong: boolean };

// An opening marker is one or more * before a word, after any opening quotes or brackets.
// A closing marker is one or more * after a word, before any closing punctuation.
const OPEN = /^([("'“‘]*)\*+(?=[^\s*])/;
const CLOSE = /(?<=[^\s*])\*+([.,:;!?)"'”’…]*)$/;

const unopen = (token: string) => token.replace(OPEN, "$1");
const unclose = (token: string) => token.replace(CLOSE, "$1");

const strongRun = (tokens: readonly string[]): readonly Word[] =>
  tokens.map((token, k) => {
    const opened = k === 0 ? unopen(token) : token;
    return { text: k === tokens.length - 1 ? unclose(opened) : opened, strong: true };
  });

const walk = (tokens: readonly string[], i: number): readonly Word[] => {
  if (i >= tokens.length) return [];
  const token = tokens[i];
  const end = OPEN.test(token) ? tokens.findIndex((t, k) => k >= i && CLOSE.test(k === i ? unopen(t) : t)) : -1;
  if (end === -1) return [{ text: token, strong: false }, ...walk(tokens, i + 1)];
  return [...strongRun(tokens.slice(i, end + 1)), ...walk(tokens, end + 1)];
};

// Splits text into words. Everything from a word starting with * to the next word ending with *
// is strong; an asterisk without a partner stays as typed.
export const parseEmphasis = (text: string): readonly Word[] =>
  walk(text.split(/\s+/).filter(Boolean), 0).filter((w) => w.text !== "");

export const plainText = (text: string): string => parseEmphasis(text).map((w) => w.text).join(" ");

// Removes marker asterisks from a single word (captions get one word at a time), keeping any other
// asterisk such as the one in "2*3=6".
export const stripMarkers = (word: string): string => unclose(unopen(word));
