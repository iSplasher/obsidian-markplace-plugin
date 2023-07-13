import { ParserLocationError } from '../utils/error';
import logger from '../utils/logger';
import { argsort } from '../utils/misc';

export interface ParserContent {
	name?: string;
	content: string;
}

const PARSER_TOKEN = {
	tagStart: "%%{",
	tagEnd: "}%%",
	escape: "\\",
};

const END_TOKEN = "end";

const SEPARATOR_TOKEN = "---";

const IGNORE_COMMENT_TOKEN = "" as string; // empty disables this atm
const IGNORE_COMMENT_TERMINATOR = "\n"; // ignore until next line

enum TAG_TYPE {
	START,
	START_IMMEDIATE,
	START_DELAYED,
	SEPARATOR,
	END,
}

const TAG_MODIFIER_TOKEN = {
	[TAG_TYPE.START]: "",
	[TAG_TYPE.START_IMMEDIATE]: "!",
	[TAG_TYPE.START_DELAYED]: "*",
};

// LRU cache
class ParsedCache {
	private MAX_CHARS = 1000 * 5; // 5 files with 1k characters each

	private index: Map<
		string,
		{
			charCount: number;
			parsed: Parsed;
		}
	>;

	private charsCount = 0;

	constructor() {
		this.index = new Map();
	}

	cache(content: ParserContent) {
		if (content.name) {
			const charCount = content.content.length;

			if (!this.index.has(content.name)) {
				const parsed = new Parsed(content);
				this.index.set(content.name, {
					charCount,
					parsed,
				});

				this.charsCount += charCount;
			} else {
				// update char count
				const v = this.index.get(content.name);
				if (v) {
					this.charsCount -= v?.charCount;
					this.charsCount += charCount;
					v.charCount = charCount;
				}
			}

			// refresh
			this.refresh(content.name);

			if (this.charsCount > this.MAX_CHARS) {
				this.evict();
			}

			return this.index.get(content.name)?.parsed as Parsed;
		} else {
			return new Parsed(content);
		}
	}

	private refresh(key: string) {
		type IndexValue = Unwrap2<ParsedCache["index"]>[1];

		const v = this.index.get(key) as IndexValue;
		this.index.delete(key);
		this.index.set(key, v);
	}

	private evict() {
		if (this.index.size < 2) return; // keep at least one entry
		// Map keeps insertion order, so this will evict the oldest entry
		const key = this.index.keys().next().value;
		const charCount = this.index.get(key)?.charCount as number;
		this.charsCount -= charCount;
		this.index.delete(key);
	}
}

export default class Parser {
	cache: ParsedCache;

	constructor() {
		this.cache = new ParsedCache();
	}

	parse(content: ParserContent) {
		const parsed = this.cache.cache(content);
		parsed.update(content);

		return parsed;
	}
}

type LineNumber = number;
type CharacterPosition = number;

type TagLocation = {
	start: CharacterPosition;
	// NOTE: this is the position AFTER the last character of the tag
	// this is to make it easier to get the content of the tag, e.g.: content.slice(start, end)
	end: CharacterPosition;
	content: string;
	outerContent: string;
	escapes: CharacterPosition[]; // position from tag start
};

export class Block {
	startTag: TagLocation;
	startTagLineNumber: LineNumber;
	sepTag: TagLocation | null;
	endTag: TagLocation;
	endTagLineNumber: LineNumber;
	readonly originalEndTagLineNumber: LineNumber;

	contentStart: CharacterPosition;
	contentEnd: CharacterPosition;

	preContent: string;
	postContent: string;

	private _content: string;
	private rendered: boolean;

	constructor(
		readonly originalStartTag: TagLocation,
		readonly startTagType: TAG_TYPE,
		readonly originalStartTagLineNumber: LineNumber,
		readonly originalSepTag: TagLocation | null,
		readonly originalEndTag: TagLocation,
		readonly endTagType: TAG_TYPE,
		readonly originalContent: string,
		readonly legacy?: Block
	) {
		this.startTag = originalStartTag;
		this.startTagLineNumber = originalStartTagLineNumber;
		this.sepTag = originalSepTag;
		this.endTag = originalEndTag;
		this._content = originalContent;
		this.endTagLineNumber = 0;
		this.contentStart = 0;
		this.contentEnd = 0;
		this.rendered = false;

		this.preContent = "";
		this.postContent = "";

		this.processContent();

		this.originalEndTagLineNumber = this.endTagLineNumber;
	}

	// how many chars the content has changed to the original
	get deltaPosition() {
		return this.content.length - this.originalContent.length;
	}

	get outerContent() {
		return (
			this.startTag.outerContent + this.content + this.endTag.outerContent
		);
	}

	// we deliberately don't implement a getter here
	get content() {
		return this._content;
	}

	private processContent() {
		this.contentStart = this.startTag.end;

		// update positions
		const newEndTag = { ...this.endTag };
		newEndTag.start = this.startTag.end + this.content.length;
		newEndTag.end = newEndTag.start + this.endTag.outerContent.length;

		this.endTag = newEndTag;
		this.contentEnd = newEndTag.start - 1;
		this.endTagLineNumber =
			this.startTagLineNumber + this.content.split("\n").length - 1;

		if (!this.sepTag) {
			this.preContent = this.content;
			this.postContent = "";
		} else {
			const sepTagContentStart = this.sepTag.start - this.startTag.end;
			const sepTagContentEnd = this.sepTag.end - this.startTag.end;

			this.preContent = this.content.slice(0, sepTagContentStart);
			this.postContent = this.content.slice(sepTagContentEnd);
		}
	}

	diff(preContent: string) {
		return preContent.trim() !== this.preContent.trim();
	}

	isNew() {
		// if we have a legacy block, check if different from legacy
		if (this.legacy && !this.legacy.diff(this.preContent)) {
			return false;
		}

		return true;
	}

	singleLine() {
		return this.startTagLineNumber === this.endTagLineNumber;
	}

	hasRendered() {
		return this.rendered;
	}

	hasLegacyRender() {
		if (
			!this.isNew() &&
			this.legacy &&
			(this.legacy.hasRendered() || this.legacy.hasLegacyRender())
		) {
			if (this.postContent.trim() === this.legacy.postContent.trim()) {
				return true;
			}
		}

		return false;
	}

	modified() {
		return this.content !== this.originalContent;
	}

	mapToContentPosition(position: CharacterPosition) {
		return position - this.contentStart;
	}

	mapFromContentPosition(position: CharacterPosition) {
		return this.contentStart + position;
	}

	private addSeparatorTag() {
		const content = ` ${SEPARATOR_TOKEN} `;

		const outerContent = `${PARSER_TOKEN.tagStart}${content}${PARSER_TOKEN.tagEnd}`;

		let padStart = "";
		let padEnd = "";

		if (this.singleLine()) {
			padStart = " ";
			padEnd = " ";
		} else {
			padStart = "\n";
			padEnd = "\n";
		}

		// which tag to use as reference
		const tagStart = this.endTag.start;

		// start and end of sep tag
		const start = tagStart + padStart.length;
		const end = start + outerContent.length;

		const sepTag: TagLocation = {
			start,
			end,
			content,
			outerContent,
			escapes: [],
		};

		const sepContent = padStart + outerContent + padEnd;

		const tagContentStart = this.mapToContentPosition(tagStart);
		const preSepContent = this.content.slice(0, tagContentStart);
		const postSepContent = this.content.slice(tagContentStart);

		const newContent = preSepContent + sepContent + postSepContent;

		this._content = newContent;
		this.sepTag = sepTag;

		this.processContent();
	}

	private addAfterSeparatorTag(content: string) {
		if (!this.sepTag) {
			return false;
		}

		let padStart = "";
		let padEnd = "";

		if (this.singleLine()) {
			padStart = "";
			padEnd = "";
		} else {
			padStart = "\n";
			padEnd = "\n";
		}

		const renderContent = padStart + content + padEnd;

		const sepContentEnd = this.mapToContentPosition(this.sepTag.end);
		const preSepEndContent = this.content.slice(0, sepContentEnd);

		const newContent = preSepEndContent + renderContent;

		this._content = newContent;

		this.processContent();

		return true;
	}

	setRender(rendered: boolean) {
		this.rendered = rendered;
	}

	render(content: string) {
		if (!this.rendered) {
			if (!this.sepTag) {
				this.addSeparatorTag();
			}

			if (this.addAfterSeparatorTag(content)) {
				this.setRender(true);
				return true;
			}
		}

		return false;
	}
}

export class Parsed {
	content: ParserContent;
	blocks: Map<CharacterPosition, Block>;

	private blocksCache: Map<string, Block>;

	private _dirty = true;
	private _changed = false;

	constructor(content: ParserContent) {
		this.content = content;
		this.blocks = new Map();

		this.blocksCache = new Map();
	}

	blockCount() {
		return this.blocks.size;
	}

	isDirty() {
		return this._dirty;
	}

	dirty() {
		this._dirty = true;
	}

	hasChanged() {
		return this._changed;
	}

	needsRender() {
		if (this.hasChanged()) {
			return true;
		}

		for (const block of this.blocks.values()) {
			if (!block.hasLegacyRender() && !block.hasRendered()) {
				return true;
			}
		}

		return false;
	}

	update(content?: ParserContent) {
		if (content) {
			const oldContent = this.content;
			this.content = content;

			if (this.diff(oldContent.content)) {
				this.dirty();
			}
		}

		this.scan();
	}

	diff(content: string) {
		// TODO: better diffing
		return content.trim() !== this.content.content.trim();
	}

	blocksDiff(blocks: Block[]) {
		let idx = 0;
		for (const block of this.blocks.values()) {
			const otherBlock = blocks?.[idx];
			if (!otherBlock || block.diff(otherBlock.preContent)) {
				return true;
			}
			idx++;
		}
	}

	private scan() {
		this._changed = false;

		if (!this._dirty) return;

		let legacyIdMismatch = false;

		const currentBlocks = [...this.blocks.values()];
		const blocks: Parsed["blocks"] = new Map();
		const locations = this.getTagLocations(this.content.content);

		let blockIndex = -1;
		let startTag = locations.shift();

		while (startTag) {
			const startTagType = this.getTagType(startTag);

			if (startTagType === TAG_TYPE.END) {
				throw this.missingStartTagError(startTag);
			}

			let endTag = locations.shift();
			if (!endTag) {
				throw this.missingEndTagError(startTag);
			}

			let sepTag: TagLocation | null = null;

			let endTagType = this.getTagType(endTag);

			const endTagContent = endTag.content.trim();

			if (endTagType === TAG_TYPE.SEPARATOR) {
				sepTag = endTag;
				endTag = locations.shift();
				if (!endTag) {
					throw this.missingEndTagError(startTag);
				}
				endTagType = this.getTagType(endTag);
			} else if (
				endTagContent.length >= 2 &&
				(SEPARATOR_TOKEN.startsWith(endTagContent) ||
					endTagContent.startsWith(SEPARATOR_TOKEN))
			) {
				// check if malformed sep tag
				throw this.malformedSepTagError(endTag);
			}

			if (sepTag && endTagType === TAG_TYPE.SEPARATOR) {
				throw this.multipleSepTagError(sepTag);
			} else if (endTagType !== TAG_TYPE.END) {
				throw this.missingEndTagError(startTag);
			}

			const content = this.content.content.slice(
				startTag.end,
				endTag.start
			);

			// find legacy block if exists
			blockIndex++;
			let legacy: Block | undefined = currentBlocks?.[blockIndex];

			if (legacy) {
				// if same index and same preContent, it might've just been moved or id changed
				const preContent = sepTag
					? content.slice(0, sepTag.start - startTag.end)
					: content;
				if (preContent.trim() !== legacy.preContent.trim()) {
					legacy = undefined;
				} else {
					legacyIdMismatch = true;
				}
				// else, if can be found in cache with same id
			} else if (this.blocksCache.has(startTag.content.trim())) {
				legacy = this.blocksCache.get(startTag.content.trim());
			}

			const [startTagLineNumber] = this.getLineNumberAtPositions([
				startTag.start,
			]);

			const block = new Block(
				startTag,
				startTagType,
				startTagLineNumber,
				sepTag,
				endTag,
				endTagType,
				content,
				legacy
			);

			blocks.set(startTag.start, block);

			startTag = locations.shift();
		}

		this._dirty = false;

		// check if changed
		if ([...blocks.values()].some((b) => b.isNew())) {
			this._changed = true;
		} else {
			// edge case
			if (blocks.size !== this.blocks.size) {
				this._changed = true;
			} else {
				this._changed = false;
			}
		}

		if (this._changed || legacyIdMismatch) {
			this.blocksCache = new Map();
			for (const block of blocks.values()) {
				this.blocksCache.set(block.startTag.content.trim(), block);
			}
		}

		this.blocks = blocks;
	}

	private getTagLocations(text: string) {
		let tag: TagLocation = {
			start: -1,
			end: -1,
			content: "",
			outerContent: "",
			escapes: [],
		};

		const newTag = () => ({
			start: -1,
			end: -1,
			content: "",
			outerContent: "",
			escapes: [],
		});

		const tags: TagLocation[] = [];

		let terminator = "";

		let line = -1;
		let startLine = -1;

		let n = 0;
		for (; n < text.length; n++) {
			const c = text[n];

			if (c === "\n") {
				line++;
			}

			if (tag.start !== -1 && startLine !== line) {
				logger.warn(
					"Unterminated block tag token at line",
					startLine,
					"in",
					this.content.name
				);
				// reset tag and backtrack to look for next tag
				tag = newTag();
				n--;
			}

			if (terminator) {
				// skip until terminator
				const e = text.slice(n, n + terminator.length);
				if (e === terminator) {
					terminator = "";
					n += terminator.length - 1;
				} else {
					continue;
				}
			}

			const token =
				tag.start === -1 ? PARSER_TOKEN.tagStart : PARSER_TOKEN.tagEnd;

			if (token.startsWith(c)) {
				const s = text.slice(n, n + token.length);
				if (s !== token) {
					continue;
				}

				// if escaped, skip
				const e = text.slice(n - 1, n);
				if (e === PARSER_TOKEN.escape) {
					tag.escapes.push(n - 1 - tag.start);
					continue;
				}

				if (
					IGNORE_COMMENT_TOKEN &&
					IGNORE_COMMENT_TOKEN.startsWith(token)
				) {
					// if obsidian comment, skip; %% comment
					const e = text.slice(n, n + IGNORE_COMMENT_TOKEN.length);
					if (e === IGNORE_COMMENT_TOKEN) {
						// skip until next line
						terminator = IGNORE_COMMENT_TERMINATOR;
						continue;
					}
				}

				if (tag.start === -1) {
					tag.start = n;
					startLine = line;
					// skip until end of token
					n += token.length - 1;
				} else {
					// only allows tokens to be on the same line
					if (line === startLine) {
						tag.end = n + token.length;
						tag.content = text.slice(
							tag.start + PARSER_TOKEN.tagStart.length,
							tag.end - PARSER_TOKEN.tagEnd.length
						);
						tag.outerContent = text.slice(tag.start, tag.end);
						tags.push(tag);
						// skip until end of token
						n += token.length - 1;
					} else {
						// if token is on a different line, then it starts a new block
						// so we backtrack with empty block
						n--;
					}

					tag = newTag();
				}
			}
		}

		return tags;
	}

	private getTagType(tag: TagLocation) {
		let t: TAG_TYPE | undefined = undefined;

		if (tag.content.trim().toLowerCase() === SEPARATOR_TOKEN) {
			t = TAG_TYPE.SEPARATOR;
		} else if (tag.content.trim().toLowerCase() === END_TOKEN) {
			const modifierCharEnd = tag.outerContent
				.slice(
					PARSER_TOKEN.tagStart.length,
					PARSER_TOKEN.tagStart.length + 1
				)
				.trim();

			// end tag doesn't have a modifier
			if (!modifierCharEnd) {
				t = TAG_TYPE.END;
			}
		} else {
			const tokens = Object.values(TAG_MODIFIER_TOKEN);
			const modifierCharStart = tag.outerContent
				.slice(
					PARSER_TOKEN.tagStart.length,
					PARSER_TOKEN.tagStart.length + 1
				)
				.trim();

			// only if modifier is valid

			if (tokens.every((x) => x.startsWith(modifierCharStart))) {
				const l = PARSER_TOKEN.tagStart.length;
				for (const [k, v] of Object.entries(TAG_MODIFIER_TOKEN)) {
					const s = tag.outerContent.slice(l, l + v.length);
					if (s === v) {
						t = parseInt(k);
						break;
					}
				}
			} else {
				throw ParserLocationError.notice(
					`Invalid block tag modifier '${modifierCharStart}'`,
					this.getLineNumberAtPosition(tag.start),
					this.content.name,
					"Valid modifiers are: ",
					tokens
						.map((m) => (m ? `'${m}'` : "'no modifier'"))
						.join(", ")
				);
			}
		}

		if (t === undefined) {
			throw ParserLocationError.notice(
				"Unknown block tag type",
				this.getLineNumberAtPosition(tag.start),
				this.content.name
			);
		}

		return t;
	}

	private getLineNumberAtPosition(pos: CharacterPosition) {
		return this.getLineNumberAtPositions([pos])[0];
	}

	private getLineNumberAtPositions(positions: CharacterPosition[]) {
		const indices = argsort(positions);

		const lines = this.content.content.split("\n");
		const lineNumbers: LineNumber[] = Array(positions.length).fill(1);

		let line = lines.shift() as string;
		let total = line.length;
		let lineCount: LineNumber = 1;

		for (const posIndex of indices) {
			while (total < positions[posIndex] && lines.length) {
				line = lines.shift() as string;
				total += line.length + 1; // +1 for newline
				lineCount++;
			}

			lineNumbers[posIndex] = lineCount;
		}
		return lineNumbers;
	}

	// Move to error class? idk
	private missingStartTagError(tag: TagLocation) {
		return ParserLocationError.notice(
			"Missing start block tag",
			this.getLineNumberAtPosition(tag.start),
			this.content.name,
			"Did you forget to start the block with " +
				PARSER_TOKEN.tagStart +
				" Your Block Text " +
				PARSER_TOKEN.tagEnd +
				"?"
		);
	}

	private missingEndTagError(tag: TagLocation) {
		return ParserLocationError.notice(
			"Missing end block tag",
			this.getLineNumberAtPosition(tag.start),
			this.content.name,
			"Did you forget to close the block with " +
				PARSER_TOKEN.tagStart +
				` ${END_TOKEN} ` +
				PARSER_TOKEN.tagEnd +
				"?"
		);
	}

	private multipleSepTagError(tag: TagLocation) {
		return ParserLocationError.notice(
			"Multiple separator tags in block are not allowed",
			this.getLineNumberAtPosition(tag.start),
			this.content.name
		);
	}

	private malformedSepTagError(tag: TagLocation) {
		return ParserLocationError.notice(
			"Marlformed separator tag in block",
			this.getLineNumberAtPosition(tag.start),
			this.content.name,
			"The separator tag should look like ",
			` ${PARSER_TOKEN.tagStart} ${SEPARATOR_TOKEN} ${PARSER_TOKEN.tagEnd}`
		);
	}
}
