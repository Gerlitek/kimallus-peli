/** Hair clips for the unicorn's mane. */
export const CLIPS = ['heart', 'star', 'bow', 'flower', 'gem'] as const;
export type ClipKind = (typeof CLIPS)[number];
