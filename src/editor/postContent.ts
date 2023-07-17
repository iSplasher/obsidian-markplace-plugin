import cx from "classnames";

import { RegExpCursor } from "@codemirror/search";
import {
	EditorState,
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
import { escapeRegExp } from "../utils/misc";
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
		`(?<=${TAG_REGEX.sep.source})([\\s\\S]+)(?=${TAG_REGEX.end.source})`,
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
				effects: updateBlockPostContentEffect.of([
					this.from,
					this.to,
					this.content,
				]),
			});
		};

		return el;
	}
}

const blockPostContentDecorationsField = StateField.define<DecorationSet>({
	create(state) {
		return Decoration.none;
	},

	update(oldState, tr) {
		if (!tr.docChanged && oldState !== Decoration.none) {
			return oldState;
		}

		const builder = new RangeSetBuilder<Decoration>();

		const regc = new RegExpCursor(
			tr.state.doc,
			CONTENT_REGEX.postContent.source,
			{}
		);

		for (const { from, to, match } of regc) {
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
		return EditorView.decorations.from(field);
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

const updateBlockPostContentEffect =
	StateEffect.define<[number, number, string]>();

const blockPostContentRangeField = StateField.define<[number, number, string]>({
	create(state) {
		return [0, 0, ""];
	},

	update(oldState, tr) {
		let newState = oldState;

		for (const effect of tr.effects) {
			if (effect.is(updateBlockPostContentEffect)) {
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

	const [from, to, content] = state.field(blockPostContentRangeField);

	if (!content) {
		return tooltips;
	}

	tooltips.push({
		pos: from,
		end: to,
		create(view) {
			const dom = document.createElement("div");
			dom.className = cx(CLASSES.tooltip);

			dom.createDiv({ cls: cx(CLASSES.tooltipContainer) }).createDiv({
				cls: cx(CLASSES.tooltipContent),
				text: content,
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

	const closeTooltip = (ev: any, view: EditorView) => {
		const ts = view.state.field(blockPostContentTooltipField);
		if (ts.length) {
			view.dispatch({
				effects: updateBlockPostContentEffect.of([0, 0, ""]),
			});
		}
	};

	const toolTipClose = EditorView.domEventHandlers({
		blur: closeTooltip,
		scroll: closeTooltip,
		click: closeTooltip,
		keydown: closeTooltip,
	});

	return [
		toolTips,
		toolTipClose,
		blockPostContentRangeField,
		blockPostContentDecorationsField,
		blockPostContentTooltipField,
		blockPostContentAtomicPlugin,
	];
}
