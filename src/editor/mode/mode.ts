import "./javascript";
import "./custom_overlay";

import _cx from "classnames";
import { TFile } from "obsidian";
import { escapeRegExp } from "src/utils/misc";

import { StreamLanguage } from "@codemirror/language";

import {
	END_TOKEN,
	PARSER_TOKEN,
	SEPARATOR_TOKEN,
	TAG_MODIFIER_TOKEN,
	TAG_TYPE,
} from "../../parser/parser";
import { MarkPlaceError } from "../../utils/error";
import logger from "../../utils/logger";

import type CodeMirror from "codemirror";
import type { EditorConfiguration, Mode as CodeMirrorMode } from "codemirror";

import type MarkPlacePlugin from "../../main";

const CLASSES = {
	command: "markplace-command",
	lineBg: "markplace-line-bg",
	inlineBg: "markplace-inline-bg",
	tag: "markplace-tag",
	modifierTag: "markplace-modifier-tag",
	sepTag: "markplace-sep-tag",
	tagContent: "markplace-tag-content",
	tagSepContent: "markplace-tag-sep-content",
	tagEndContent: "markplace-tag-end-content",
	blockPostContent: "markplace-block-post-content",
	blockPreContent: "markplace-pre-post-content",
	obsidianComment: "markplace-obsidian-comment",
};

const TAG_MODIFIER_TOKENS = Object.values(TAG_MODIFIER_TOKEN).filter(Boolean);

const escapedTagModifierTokens = TAG_MODIFIER_TOKENS.map(escapeRegExp);

const escapedTokenEscape = escapeRegExp(PARSER_TOKEN.escape);
const escapedTagStart = escapeRegExp(PARSER_TOKEN.tagStart);
const escapedTagEnd = escapeRegExp(PARSER_TOKEN.tagEnd);

const TOKEN_REGEX = {
	tagStart: new RegExp(`(?<!${escapedTokenEscape})${escapedTagStart}`),
	tagEnd: new RegExp(`(?<!${escapedTokenEscape})${escapedTagEnd}`),
	tagModifierStart: new RegExp(
		`${escapedTagStart}(${escapedTagModifierTokens.join("|")})?`
	),
};

const TAG_CONTENT_REGEX = {
	start: new RegExp(`(.*)${TOKEN_REGEX.tagEnd.source}`),
	end: new RegExp(`\\s*${END_TOKEN}\\s*${TOKEN_REGEX.tagEnd.source}`),
	sep: new RegExp(`\\s*${SEPARATOR_TOKEN}\\s*${TOKEN_REGEX.tagEnd.source}`),
};

const OBS_COMMENT_TOKEN_REGEX = /%%/;

const modeId = "markplace";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSModeState {}

interface ModeState extends JSModeState {
	cls: string;
	tagCls: string;
	contentTagType: TAG_TYPE | null;
	blockContent: boolean;
	blockContentType: "pre" | "post" | "";
}

export default class Mode {
	// private cursor_jumper: CursorJumper;

	private jsMode: CodeMirrorMode<unknown>;
	private overlayMode: (
		...modes: CodeMirrorMode<any>[]
	) => CodeMirrorMode<any>;

	public constructor(
		private plugin: MarkPlacePlugin,
		private cm: typeof CodeMirror
	) {
		// this.cursor_jumper = new CursorJumper();
	}

	shouldHighlight(): boolean {
		return true;
	}

	async register(): Promise<void> {
		await this.registerCodeMirrorMode();
		// this.plugin.registerEditorSuggest(new Autocomplete());

		// Selectively enable syntax highlighting via per-platform preferences.
		if (this.shouldHighlight()) {
			this.plugin.registerEditorExtension(
				StreamLanguage.define(
					this.cm.getMode({}, { name: modeId }) as any
				)
			);
			logger.devDebugNotice("Enabled markplace mode");
		}
	}

	async jump_to_next_cursor_location(
		file: TFile | null = null,
		auto_jump = false
	): Promise<void> {
		const auto_jump_to_cursor = true;
		if (auto_jump && !auto_jump_to_cursor) {
			return;
		}
		if (file && app.workspace.getActiveFile() !== file) {
			return;
		}
		// await this.cursor_jumper.jump_to_next_cursor_location();
	}

	modeFactory(
		cm: typeof CodeMirror,
		config: EditorConfiguration,
		modeOptions: any
	): CodeMirrorMode<any> {
		const jsMode = this.jsMode;

		const cx = (...args: Parameters<typeof _cx>) =>
			_cx(CLASSES.command, CLASSES.inlineBg, ...args);

		const markplaceMode: CodeMirrorMode<ModeState> = {
			startState: function () {
				const jsState = cm.startState(jsMode) as JSModeState;
				return {
					...jsState,
					contentTagType: null,
					cls: "",
					block: false,
					blockContentType: "",
					tagCls: "",
					blockContent: false,
				};
			},
			copyState: function (state) {
				const jsState = cm.startState(jsMode) as JSModeState;
				const new_state = {
					...jsState,
					contentTagType: state.contentTagType,
					cls: state.cls,
					blockContent: state.blockContent,
					blockContentType: state.blockContentType,
					tagCls: state.tagCls,
				};
				return new_state;
			},
			blankLine: function (state) {
				if (state.blockContentType) {
					return `line-background-${CLASSES.lineBg}`;
				}
				return null;
			},
			token: function (stream, state) {
				if (state.contentTagType !== null) {
					// inside of tag
					if (!state.blockContent && !state.blockContentType) {
						state.cls = cx(CLASSES.tagContent);

						// if sep content
						const sepMatch = stream.match(
							TAG_CONTENT_REGEX.sep,
							false
						);
						if (sepMatch != null) {
							state.contentTagType = TAG_TYPE.SEPARATOR;
							state.cls = cx(state.cls, CLASSES.tagSepContent);

							// advance until end of tag
							while (
								stream.next() != null &&
								!stream.match(TOKEN_REGEX.tagEnd, false)
							);

							return `${state.cls}`;
						}

						// if end content
						const endMatch = stream.match(
							TAG_CONTENT_REGEX.end,
							false
						);
						if (endMatch != null) {
							state.contentTagType = TAG_TYPE.END;
							state.cls = cx(state.cls, CLASSES.tagEndContent);

							// advance until end of tag
							while (
								stream.next() != null &&
								!stream.match(TOKEN_REGEX.tagEnd, false)
							);

							return `${state.cls}`;
						}

						// if end tag token
						if (stream.match(TOKEN_REGEX.tagEnd, true)) {
							if (state.contentTagType === TAG_TYPE.END) {
								// if this is end tag
								state.blockContent = false;
								state.blockContentType = "";
								state.contentTagType = null;
							} else if (
								state.contentTagType === TAG_TYPE.SEPARATOR
							) {
								state.blockContent = true;
								// if there was a sep, we post block now
								state.blockContentType = "post";
							} else {
								state.blockContent = true;
								// else we pre
								state.blockContentType = "pre";
							}

							// reset
							state.cls = cx("");

							return `${state.tagCls}`;
						}

						// start content

						// advance until end of tag
						while (
							stream.next() != null &&
							!stream.match(TOKEN_REGEX.tagEnd, false)
						);

						return `${state.cls}`;
					} else if (state.blockContent) {
						// inside of block

						const lineBg = stream.sol();

						if (state.blockContentType === "pre") {
							// advance until start of a tag
							state.cls = cx(CLASSES.blockPreContent, {
								[`line-background-${CLASSES.lineBg}`]: lineBg,
							});

							if (!stream.match(TOKEN_REGEX.tagStart, false)) {
								// special case for obsidian comments
								if (
									stream.sol() &&
									stream.match(OBS_COMMENT_TOKEN_REGEX, false)
								) {
									stream.skipToEnd();
									return cx(
										state.cls,
										CLASSES.obsidianComment
									);
								}

								const jsCls =
									jsMode.token && jsMode.token(stream, state);

								return `${jsCls} ${state.cls}`;
							} else {
								state.blockContent = false;
							}
						} else if (state.blockContentType === "post") {
							// post

							state.cls = cx(CLASSES.blockPostContent, {
								[`line-background-${CLASSES.lineBg}`]: lineBg,
							});

							// advance until start of a tag
							if (!stream.match(TOKEN_REGEX.tagStart, false)) {
								stream.next();

								return `${state.cls}`;
							} else {
								state.blockContent = false;
							}
						}
					}
				}

				// start tag token

				const match = stream.match(TOKEN_REGEX.tagModifierStart, true);
				if (match != null) {
					state.blockContent = false;
					state.blockContentType = "";

					// if no tag type, this is start tag
					if (!state.contentTagType) {
						state.contentTagType = TAG_TYPE.START;
					}

					state.tagCls = cx(CLASSES.tag);

					if (state.contentTagType === TAG_TYPE.START) {
						const modifier = match[1];

						switch (modifier) {
							case TAG_MODIFIER_TOKEN[TAG_TYPE.START_DELAYED]: {
								state.tagCls = cx(
									state.tagCls,
									CLASSES.modifierTag
								);
								state.contentTagType = TAG_TYPE.START_DELAYED;
								break;
							}
							case TAG_MODIFIER_TOKEN[TAG_TYPE.START_IMMEDIATE]: {
								state.tagCls = cx(
									state.tagCls,
									CLASSES.modifierTag
								);
								state.contentTagType = TAG_TYPE.START_IMMEDIATE;
								break;
							}
							default:
								break;
						}
					}

					// if is sep tag
					if (stream.match(TAG_CONTENT_REGEX.sep, false)) {
						state.tagCls = cx(state.tagCls, CLASSES.sepTag);
					}

					state.cls = cx(state.tagCls);

					return `${state.cls}`;
				}

				while (
					stream.next() != null &&
					!stream.match(TOKEN_REGEX.tagStart, false)
				);
				return null;
			},
		};

		return this.overlayMode(
			this.cm.getMode(config, "hypermd"),
			markplaceMode
		);
	}

	async registerCodeMirrorMode(): Promise<void> {
		// cm-editor-syntax-highlight-obsidian plugin
		// https://codemirror.net/doc/manual.html#modeapi
		// https://codemirror.net/mode/diff/diff.js
		// https://codemirror.net/demo/mustache.html
		// https://marijnhaverbeke.nl/blog/codemirror-mode-system.html

		// If no configuration requests highlighting we should bail.
		if (!this.shouldHighlight()) {
			return;
		}

		this.jsMode = this.cm.getMode({}, "javascript");
		if (this.jsMode.name === "null") {
			MarkPlaceError.notice(
				"Javascript syntax mode couldn't be found, can't enable syntax highlighting."
			);
			return;
		}

		// Custom overlay mode used to handle edge cases
		// @ts-ignore
		this.overlayMode = this.cm.customOverlayMode;
		if (this.overlayMode == null) {
			MarkPlaceError.notice(
				"Couldn't find customOverlayMode, can't enable syntax highlighting."
			);
			return;
		}

		this.cm.defineMode(modeId, (...args) =>
			this.modeFactory(this.cm, ...args)
		);

		logger.devDebugNotice("Registered MarkPlace editor mode");
	}
}
