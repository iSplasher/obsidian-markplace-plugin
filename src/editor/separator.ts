import cx from "classnames";

import { RegExpCursor } from "@codemirror/search";
import { RangeSetBuilder, StateField } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginSpec,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";

import { CLASSES } from "../constants";
import MarkPlace from "../markplace";
import { SEPARATOR_TOKEN } from "../parser/parser";
import { TAG_REGEX } from "./postContent";

class SeparatorWidget extends WidgetType {
	constructor(
		public from: number,
		public to: number,
		public content: string
	) {
		super();
	}

	toDOM(view: EditorView): HTMLElement {
		const cls = cx(CLASSES.blockSeparator);
		const el = document.createElement("span");
		el.className = cls;

		el.innerText = `${SEPARATOR_TOKEN}`;

		return el;
	}
}

const blockSeparatorDecorationsField = StateField.define<DecorationSet>({
	create(state) {
		return Decoration.none;
	},

	update(oldState, tr) {
		if (!tr.docChanged && oldState !== Decoration.none) {
			return oldState;
		}

		const builder = new RangeSetBuilder<Decoration>();

		const regc = new RegExpCursor(tr.state.doc, TAG_REGEX.sep.source, {});

		for (const { from, to, match } of regc) {
			const content = match[1];

			builder.add(
				from,
				to,
				Decoration.replace({
					widget: new SeparatorWidget(from, to, content),
				})
			);
		}

		return builder.finish();
	},
	provide(field: StateField<DecorationSet>) {
		return EditorView.decorations.from(field);
	},
});

class BlockSeparatorAtomicPlugin implements PluginValue {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = view.state.field(blockSeparatorDecorationsField);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged) {
			this.decorations = update.state.field(
				blockSeparatorDecorationsField
			);
		}
	}

	destroy() {}
}

const blockSeparatorAtomicPluginSpec: PluginSpec<BlockSeparatorAtomicPlugin> = {
	decorations: (value: BlockSeparatorAtomicPlugin) => value.decorations,
	provide: (plugin) =>
		EditorView.atomicRanges.of((view) => {
			return view.plugin(plugin)?.decorations || Decoration.none;
		}),
};

export function getSeparatorExtenstions(markplace: MarkPlace) {
	const blockPostContentAtomicPlugin = ViewPlugin.fromClass(
		BlockSeparatorAtomicPlugin,
		blockSeparatorAtomicPluginSpec
	);

	return [blockSeparatorDecorationsField, blockPostContentAtomicPlugin];
}
