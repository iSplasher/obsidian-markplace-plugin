import "../styles/markplace.scss";

import { Editor, MarkdownView, Notice, Plugin } from "obsidian";

import ErrorModal from "./components/modals/error";
import MarkPlaceSettingTab, {
	DEFAULT_SETTINGS,
	MarkPlacePluginSettings,
} from "./components/settings";
import { constant } from "./constants";
import Mode from "./editor/mode/mode";
import { getPostContentExtenstions } from "./editor/postContent";
import { getSeparatorExtenstions } from "./editor/separator";
import Emitter from "./events";
import MarkPlace from "./markplace";
import { MarkPlaceError } from "./utils/error";

export default class MarkPlacePlugin extends Plugin {
	settings: MarkPlacePluginSettings;
	markplace?: MarkPlace;
	mode?: Mode;

	async onload() {
		constant.loaded = true;
		constant.app = this.app;
		constant.events = new Emitter();

		await this.loadSettings();

		if (constant.isDev) {
			// This creates an icon in the left ribbon.
			const ribbonIconEl = this.addRibbonIcon(
				"dice",
				"MarkPlace",
				(evt: MouseEvent) => {
					// Called when the user clicks the icon.
					new Notice("This is a notice!");
				}
			);
			// Perform additional things with the ribbon
			ribbonIconEl.addClass("my-plugin-ribbon-class");

			// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
			const statusBarItemEl = this.addStatusBarItem();
			statusBarItemEl.setText("Status Bar Text");

			// This adds a simple command that can be triggered anywhere
			this.addCommand({
				id: "open-sample-modal-simple",
				name: "Open sample modal (simple)",
				callback: () => {
					throw MarkPlaceError.notice("test", "details\n", "here");
				},
			});
			// This adds an editor command that can perform some operation on the current editor instance
			this.addCommand({
				id: "sample-editor-command",
				name: "Sample editor command",
				editorCallback: (editor: Editor, view: MarkdownView) => {
					console.log(editor.getSelection());
					editor.replaceSelection("Sample Editor Command");
				},
			});
			// This adds a complex command that can check whether the current state of the app allows execution of the command
			this.addCommand({
				id: "open-sample-modal-complex",
				name: "Open sample modal (complex)",
				checkCallback: (checking: boolean) => {
					// Conditions to check
					const markdownView =
						this.app.workspace.getActiveViewOfType(MarkdownView);
					if (markdownView) {
						// If checking is true, we're simply "checking" if the command can be run.
						// If checking is false, then we want to actually perform the operation.
						if (!checking) {
							new ErrorModal(
								new MarkPlaceError("test", "details", "here")
							).open();
						}

						// This command will only show up in Command Palette when the check function returns true
						return true;
					}
				},
			});

			// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
			// Using this function will automatically remove the event listener when this plugin is disabled.
			this.registerDomEvent(document, "click", (evt: MouseEvent) => {
				// console.log("click", evt);
			});

			// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
			this.registerInterval(
				window.setInterval(
					() => console.log("setInterval"),
					5 * 60 * 1000
				)
			);
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MarkPlaceSettingTab(this.app, this));

		// @ts-expect-error
		this.mode = new Mode(this, window.CodeMirror);
		this.markplace = new MarkPlace(this);

		this.registerEditorExtension([
			...getPostContentExtenstions(this.markplace),
			...getSeparatorExtenstions(this.markplace),
			this.mode.register(),
		]);

		await this.markplace.onload();
	}

	onunload() {
		constant.loaded = false;
		this.markplace?.onunload?.();
		this.markplace = undefined;

		if (constant?.events) {
			constant.events.removeAllListeners();
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);

		constant.settings = this.settings;
	}

	async saveSettings(settings?: Partial<MarkPlacePluginSettings>) {
		const oldSettings = Object.assign({}, this.settings);
		this.settings = Object.assign(this.settings, settings);
		constant.settings = this.settings;
		await this.saveData(this.settings);

		if (constant?.events) {
			constant.events.emit("settingsChanged", this.settings, oldSettings);
		}
	}
}
