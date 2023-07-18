import cx from "classnames";

import { RegExpCursor } from "@codemirror/search";
import {
	EditorState,
	Facet,
	RangeSetBuilder,
	StateEffect,
	StateField,
} from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginSpec,
	PluginValue,
	showTooltip,
	Tooltip,
	tooltips,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";

import { CLASSES } from "../constants";
import MarkPlace from "../markplace";
import { END_TOKEN, SEPARATOR_TOKEN } from "../parser/parser";
import { equalSets, escapeRegExp } from "../utils/misc";
import { TOKEN_REGEX } from "./mode/mode";

const escapedEndToken = escapeRegExp(END_TOKEN);
const escapedSepToken = escapeRegExp(SEPARATOR_TOKEN);

export const TAG_REGEX = {
	end: new RegExp(
		`${TOKEN_REGEX.tagModifierStart.source}\\s*${escapedEndToken}\\s*${TOKEN_REGEX.tagEnd.source}`
	),
	sep: new RegExp(
		`${TOKEN_REGEX.tagStart.source}\\s*${escapedSepToken}\\s*${TOKEN_REGEX.tagEnd.source}`
	),
};

const CONTENT_REGEX = {
	postContent: new RegExp(
		`(?<=${TAG_REGEX.sep.source})([\\s\\S]*?)(?=${TAG_REGEX.end.source})`,
		"g"
	),
};

class PostContentWidget extends WidgetType {
	constructor(
		public from: number,
		public to: number,
		public content: string
	) {
		super();
	}

	toDOM(view: EditorView): HTMLElement {
		const cls = cx(CLASSES.blockPostContent);
		const el = document.createElement("span");
		el.className = cls;

		el.innerText = "{RENDER}";

		el.onclick = () => {
			view.dispatch({
				effects: updateBlockPostContentRangeEffect.of({
					from: this.from,
					to: this.to,
					content: this.content,
				}),
			});
		};

		const closeEffect = () =>
			updateBlockPostContentRangeEffect.of({
				from: 0,
				to: 0,
				content: "",
			});

		el.ondblclick = (ev) => {
			ev.preventDefault();
			view.dispatch({
				effects: [
					addBlockPostContentRevealedEffect.of(this.from),
					closeEffect(),
				],
			});
		};

		return el;
	}
}

const addBlockPostContentRevealedEffect = StateEffect.define<number>();
const clearBlockPostContentRevealedEffect = StateEffect.define<undefined>();
const blockPostContentRevealedField = StateField.define<Set<number>>({
	create(state) {
		return new Set();
	},

	compare(oldState, newState) {
		return equalSets(oldState, newState);
	},

	update(oldState, tr) {
		if (tr.docChanged) {
			return new Set();
		}

		let revealed = oldState;
		for (const effect of tr.effects) {
			if (effect.is(addBlockPostContentRevealedEffect)) {
				revealed = new Set(revealed);
				revealed.add(effect.value);
			} else if (effect.is(clearBlockPostContentRevealedEffect)) {
				revealed = new Set();
			}
		}

		return revealed;
	},

	provide(field: StateField<Set<number>>) {
		return Facet.define<Set<number>, Set<number>>().from(field);
	},
});

const blockPostContentDecorationsField = StateField.define<DecorationSet>({
	create(state) {
		return Decoration.none;
	},
	update(oldState, tr) {
		let changed = tr.docChanged;

		const revealed = tr.state.field(blockPostContentRevealedField);

		if (oldState === Decoration.none) {
			changed = true;
		}

		for (const e in tr.effects) {
			if (
				tr.effects[e].is(addBlockPostContentRevealedEffect) ||
				tr.effects[e].is(clearBlockPostContentRevealedEffect)
			) {
				changed = true;
				break;
			}
		}

		if (!changed) {
			return oldState;
		}

		const builder = new RangeSetBuilder<Decoration>();

		const regc = new RegExpCursor(
			tr.state.doc,
			CONTENT_REGEX.postContent.source,
			{}
		);

		for (const { from, to, match } of regc) {
			if (revealed.has(from)) {
				continue;
			}

			const content = match[1];

			builder.add(
				from,
				to,
				Decoration.replace({
					widget: new PostContentWidget(from, to, content),
				})
			);
		}

		return builder.finish();
	},
	provide(field: StateField<DecorationSet>) {
		return EditorView.decorations.compute(
			[field, blockPostContentRevealedField],
			(s) => s.field(field)
		);
	},
});

class BlockPostContentAtomicPlugin implements PluginValue {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = view.state.field(blockPostContentDecorationsField);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged) {
			this.decorations = update.state.field(
				blockPostContentDecorationsField
			);
		}
	}

	destroy() {}
}

const blockPostContentAtomicPluginSpec: PluginSpec<BlockPostContentAtomicPlugin> =
	{
		decorations: (value: BlockPostContentAtomicPlugin) => value.decorations,
		provide: (plugin) =>
			EditorView.atomicRanges.of((view) => {
				return view.plugin(plugin)?.decorations || Decoration.none;
			}),
	};

interface BlockPostContentRange {
	from: number;
	to: number;
	content: string;
}

const updateBlockPostContentRangeEffect =
	StateEffect.define<BlockPostContentRange>();

const blockPostContentRangeField = StateField.define<BlockPostContentRange>({
	create(state) {
		return {
			from: 0,
			to: 0,
			content: "",
		};
	},
	update(oldState, tr) {
		let newState = oldState;

		for (const effect of tr.effects) {
			if (effect.is(updateBlockPostContentRangeEffect)) {
				newState = effect.value;
			}
		}

		return newState;
	},
});

function getBlockPostContentTooltip(
	markplace: MarkPlace,
	state: EditorState
): readonly Tooltip[] {
	const tooltips: Tooltip[] = [];

	const { from, content } = state.field(blockPostContentRangeField);

	if (!content) {
		return tooltips;
	}

	tooltips.push({
		pos: from,
		create(view) {
			const dom = document.createElement("div");
			dom.className = cx(CLASSES.tooltip);
			dom.tabIndex = -1;

			const closeEffect = () =>
				updateBlockPostContentRangeEffect.of({
					from: 0,
					to: 0,
					content: "",
				});

			dom.createDiv({ cls: cx(CLASSES.tooltipContainer) }, (root) => {
				// button menu
				root.createDiv(
					{ cls: cx(CLASSES?.tooltipButtonMenu) },
					(el) => {
						const btn1 = el.createEl("button", {
							text: "Reveal",
							cls: cx(
								CLASSES.tooltipTarget,
								CLASSES.tooltipButton
							),
						});

						btn1.onclick = (ev) => {
							ev.preventDefault();
							view.dispatch({
								effects: [
									addBlockPostContentRevealedEffect.of(from),
									closeEffect(),
								],
							});
						};
					}
				);

				root.createDiv({ cls: cx(CLASSES.tooltipContent) }, (el) => {
					const c = content.split("\n");
					c.forEach((line, i) => {
						el.createEl("span", {
							text: line,
						});

						if (i < c.length - 1) {
							el.createEl("kbd", { text: "\\n" });
							el.createEl("br");
						}
					});
				});
			});

			return { dom };
		},
	});

	return tooltips;
}

export function getPostContentExtenstions(markplace: MarkPlace) {
	const blockPostContentTooltipField = StateField.define<readonly Tooltip[]>({
		create(state) {
			return getBlockPostContentTooltip(markplace, state);
		},

		update(tooltips, tr) {
			return getBlockPostContentTooltip(markplace, tr.state);
		},

		provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
	});

	const blockPostContentAtomicPlugin = ViewPlugin.fromClass(
		BlockPostContentAtomicPlugin,
		blockPostContentAtomicPluginSpec
	);

	const toolTips = tooltips({
		position: "absolute",
		tooltipSpace: (view) => {
			const rect = view.dom.getBoundingClientRect();

			return {
				top: rect.top,
				left: rect.left,
				bottom: rect.bottom,
				right: rect.right,
			};
		},
	});

	const closeTooltip = (ev: Event, view: EditorView) => {
		if (ev.defaultPrevented) {
			return;
		}

		const ts = view.state.field(blockPostContentTooltipField);
		if (ts.length) {
			view.dispatch({
				effects: updateBlockPostContentRangeEffect.of({
					from: 0,
					to: 0,
					content: "",
				}),
			});
		}
	};

	const toolTipClose = EditorView.domEventHandlers({
		blur: (e, view) => {
			function matches(el: HTMLElement | null, selector: string) {
				let x = el;
				while (x && (x as Node) !== document) {
					if (x.matches(selector)) return true;
					x = x.parentElement;
				}
				e.preventDefault();
				return false;
			}

			if (e.relatedTarget) {
				const t = e.relatedTarget as HTMLElement;
				const s = `.${CLASSES.tooltipTarget}`;
				if (matches(t, s)) {
					return;
				}
			}

			closeTooltip(e, view);
		},
		scroll: closeTooltip,
		click: (ev, view) => {
			closeTooltip(ev, view);
		},
		keydown: closeTooltip,
	});
	const focusEffect = EditorView.focusChangeEffect.of((s, focusing) => {
		return clearBlockPostContentRevealedEffect.of(undefined);
	});

	return [
		toolTips,
		toolTipClose,
		focusEffect,
		blockPostContentRevealedField,
		blockPostContentRangeField,
		blockPostContentDecorationsField,
		blockPostContentTooltipField,
		blockPostContentAtomicPlugin,
	];
}
