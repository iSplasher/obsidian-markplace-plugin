import { ParserLocationError } from "../utils/error";
import logger from "../utils/logger";
import { argsort } from "../utils/misc";

export interface ParserContent {
	name?: string;
	content: string;
}

const PARSER_TOKEN = {
	blockStart: "%%{",
	blockEnd: "}%%",
	escape: "\\",
};

const END_TOKEN = "end";

const IGNORE_COMMENT_TOKEN = "" as string; // empty disables this atm
const IGNORE_COMMENT_TERMINATOR = "\n"; // ignore until next line

enum TAG_TYPE {
	START,
	START_IMMEDIATE,
	START_DELAYED,
	END,
}

const TAG_MODIFIER_TOKEN = {
	[TAG_TYPE.START]: "",
	[TAG_TYPE.START_IMMEDIATE]: "!",
	[TAG_TYPE.START_DELAYED]: "*",
};

class ParsedCache {
	private MAX_CHARS = 1000 * 5; // 5 files with 1k characters each

	private index: Map<
		string,
		{
			lineCount: number;
			parsed: Parsed;
		}
	>;

	private charsCount = 0;

	constructor() {
		this.index = new Map();
	}

	cache(content: ParserContent) {
		if (content.name) {
			if (!this.index.has(content.name)) {
				const lineCount = content.content.length;

				const parsed = new Parsed(content);
				this.index.set(content.name, {
					lineCount,
					parsed,
				});

				this.charsCount += lineCount;
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
		const lineCount = this.index.get(key)?.lineCount as number;
		this.charsCount -= lineCount;
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
	end: CharacterPosition;
	content: string;
	outerContent: string;
	escapes: CharacterPosition[]; // position from tag start
};

class Block {
	contentStart: CharacterPosition;
	contentEnd: CharacterPosition;

	constructor(
		public startTag: TagLocation,
		public startTagType: TAG_TYPE,
		public startTagLineNumber: LineNumber,
		public endTag: TagLocation,
		public endTagType: TAG_TYPE,
		public endTagLineNumber: LineNumber,
		public content: string,
		private legacy?: Block
	) {
		this.contentStart = startTag.end + 1;
		this.contentEnd = endTag.start - 1;
	}

	diff(content: string) {
		// TODO: better diffing
		return content.trim() !== this.content.trim();
	}

	isNew() {
		// if we have a legacy block, check if different from legacy
		if (this.legacy && !this.legacy.diff(this.content)) {
			return false;
		}

		return true;
	}

	singleLine() {
		return this.startTagLineNumber === this.endTagLineNumber;
	}
}

export class Parsed {
	content: ParserContent;
	blocks: Map<CharacterPosition, Block>;

	private _dirty = true;
	private _changed = false;

	constructor(content: ParserContent) {
		this.content = content;
		this.blocks = new Map();
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
			if (!otherBlock || block.diff(otherBlock.content)) {
				return true;
			}
			idx++;
		}
	}

	private scan() {
		if (!this._dirty) return;

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

			const endBlock = locations.shift();
			if (!endBlock) {
				throw this.missingEndTagError(startTag);
			}

			const endBlockType = this.getTagType(endBlock);

			if (endBlockType !== TAG_TYPE.END) {
				throw this.missingEndTagError(startTag);
			}

			const content = this.content.content.slice(
				startTag.end,
				endBlock.start
			);

			// get legacy block if exists
			blockIndex++;
			const legacy = currentBlocks?.[blockIndex];

			const [startTagLineNumber, endTagLineNumber] =
				this.getLineNumberAtPositions([startTag.start, endBlock.start]);

			const block = new Block(
				startTag,
				startTagType,
				startTagLineNumber,
				endBlock,
				endBlockType,
				endTagLineNumber,
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
			this.blocks = blocks;
		} else {
			// edge case
			if (!blocks.size && this.blocks.size) {
				this._changed = true;
				this.blocks = blocks;
			} else {
				this._changed = false;
			}
		}
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
				tag.start === -1
					? PARSER_TOKEN.blockStart
					: PARSER_TOKEN.blockEnd;

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
							tag.start + PARSER_TOKEN.blockStart.length,
							tag.end - PARSER_TOKEN.blockEnd.length
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

		if (tag.content.trim().toLowerCase() === END_TOKEN) {
			const modifierCharEnd = tag.outerContent
				.slice(
					PARSER_TOKEN.blockStart.length,
					PARSER_TOKEN.blockStart.length + 1
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
					PARSER_TOKEN.blockStart.length,
					PARSER_TOKEN.blockStart.length + 1
				)
				.trim();

			// only if modifier is valid

			if (tokens.every((x) => x.startsWith(modifierCharStart))) {
				const l = PARSER_TOKEN.blockStart.length;
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
		let total = 0;
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
				PARSER_TOKEN.blockStart +
				" Your Block Text " +
				PARSER_TOKEN.blockEnd +
				"?"
		);
	}

	private missingEndTagError(tag: TagLocation) {
		return ParserLocationError.notice(
			"Missing end block tag",
			this.getLineNumberAtPosition(tag.start),
			this.content.name,
			"Did you forget to close the block with " +
				PARSER_TOKEN.blockStart +
				` ${END_TOKEN} ` +
				PARSER_TOKEN.blockEnd +
				"?"
		);
	}
}
