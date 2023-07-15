import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
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

export class EmojiWidget extends WidgetType {
	content: string;

	constructor(content: string) {
		super();
		this.content = content;
	}

	toDOM(view: EditorView): HTMLElement {
		const div = document.createElement("span");

		div.innerText = "👉 " + this.content + " 👈";

		return div;
	}
}

class EmojiListPlugin implements PluginValue {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged) {
			this.decorations = this.buildDecorations(update.view);
		}
	}

	destroy() {}

	buildDecorations(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();

		for (const { from, to } of view.visibleRanges) {
			syntaxTree(view.state).iterate({
				from,
				to,
				enter(node) {
					if (node.type.name.startsWith("list")) {
						// Position of the '-' or the '*'.
						const listCharFrom = node.from - 2;

						const content = view.state.sliceDoc(node.from, node.to);

						builder.add(
							listCharFrom,
							node.to,
							Decoration.replace({
								widget: new EmojiWidget(content),
							})
						);
					}
				},
			});
		}

		return builder.finish();
	}
}

const pluginSpec: PluginSpec<EmojiListPlugin> = {
	decorations: (value: EmojiListPlugin) => value.decorations,
};

export const emojiListPlugin = ViewPlugin.fromClass(
	EmojiListPlugin,
	pluginSpec
);
