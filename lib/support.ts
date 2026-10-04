/**
 * The address people are told to write to, if there is one.
 *
 * There used to be a fallback — a made-up @bharosa.app address — so the pages
 * never looked unfinished. That meant a privacy policy and a deletion page,
 * both public and both linked from the store listing, telling people to send
 * their requests to an inbox nobody reads, on a domain nobody had checked we
 * own. Sending a deletion request into the void is worse than having no
 * address on the page. So with none configured, the pages say to contact
 * Deepika directly, which is true, and the address appears the moment
 * SUPPORT_EMAIL is set.
 */
export const SUPPORT_EMAIL: string | null = process.env.SUPPORT_EMAIL?.trim() || null;
