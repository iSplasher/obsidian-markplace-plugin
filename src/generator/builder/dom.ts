import Sizzle from "sizzle";

import Builder from "../base";

interface DomProp {
	contentEl: HTMLElement;
	$: DomBuilder["$"];
	$$: DomBuilder["$$"];
	find: DomBuilder["find"];
	html: DomBuilder["html"];
	css: DomBuilder["css"];
	text: DomBuilder["text"];
	toggleClass: DomBuilder["toggleClass"];
	wrap: DomBuilder["wrap"];
	unwrap: DomBuilder["unwrap"];
	each: DomBuilder["each"];
	clone: DomBuilder["clone"];
	prev: DomBuilder["prev"];
	next: DomBuilder["next"];
	first: DomBuilder["first"];
	last: DomBuilder["last"];
	attr: DomBuilder["attr"];
	hidden: DomBuilder["hidden"];
	visible: DomBuilder["visible"];
	click: DomBuilder["click"];
	on: DomBuilder["on"];
	off: DomBuilder["off"];
	toggle: DomBuilder["toggle"];
	show: DomBuilder["show"];
	hide: DomBuilder["hide"];
	hasClass: DomBuilder["hasClass"];
}

export default class DomBuilder extends Builder {
	constructor() {
		super();

		this.addProperty(
			"dom",
			Object.getOwnPropertyDescriptor(
				DomBuilder.prototype,
				"dom"
			) as () => any
		);
	}

	get dom(): DomProp {
		return {
			contentEl: this.ctx.view.contentEl,
			$: this.$,
			$$: this.$$,
			find: this.find,
			html: this.html,
			css: this.css,
			text: this.text,
			toggleClass: this.toggleClass,
			wrap: this.wrap,
			unwrap: this.unwrap,
			each: this.each,
			clone: this.clone,
			prev: this.prev,
			next: this.next,
			first: this.first,
			last: this.last,
			attr: this.attr,
			hidden: this.hidden,
			visible: this.visible,
			click: this.click,
			on: this.on,
			off: this.off,
			toggle: this.toggle,
			show: this.show,
			hide: this.hide,
			hasClass: this.hasClass,
		};
	}

	$(selector: string) {
		return this.$$(selector)?.[0];
	}

	$$(selector: string) {
		const r = Sizzle(selector, this.ctx.view.contentEl);
		return r;
	}

	find(el: Element, selector: string) {
		return el.querySelectorAll(`:scope ${selector}`);
	}

	each(el: Element, selector: string, func: (el: Element) => void) {
		this.find(el, selector).forEach(func);
	}

	clone(el: Element) {
		return el.cloneNode(true) as Element;
	}

	html(el: Element, html?: string) {
		if (html !== undefined) {
			el.innerHTML = html;
		} else {
			return el.innerHTML;
		}
	}

	text(el: Element, text?: string) {
		if (text !== undefined) {
			el.textContent = text;
		} else {
			return el.textContent;
		}
	}

	css(el: HTMLElement, rule: string, value?: string) {
		if (value !== undefined) {
			el.style.setProperty(rule, value);
		} else {
			return getComputedStyle(el).getPropertyValue(rule);
		}
	}

	toggleClass(el: Element, className: string, force?: boolean) {
		if (force !== undefined) {
			el.classList.toggle(className, force);
		} else {
			el.classList.toggle(className);
		}
	}

	hasClass(el: Element, className: string) {
		return el.classList.contains(className);
	}

	wrap(el: Element, wrapper: string | Element) {
		if (typeof wrapper === "string") {
			if (
				wrapper.trim().startsWith("<") &&
				wrapper.trim().endsWith(">")
			) {
				const div = document.createElement("div");
				div.innerHTML = wrapper;
				wrapper = div.firstChild as Element;
			} else {
				wrapper = document.createElement(wrapper);
			}
		}

		el.replaceWith(wrapper);
		wrapper.appendChild(el);
		return wrapper;
	}

	unwrap(el: Element) {
		el.replaceWith(...el.childNodes);
	}

	prev(el: Element, selector: string) {
		const prevEl = el.previousElementSibling;
		if (!selector || (prevEl && prevEl.matches(selector))) {
			return prevEl;
		}
		return null;
	}

	next(el: Element, selector: string) {
		const nextEl = el.nextElementSibling;
		if (!selector || (nextEl && nextEl.matches(selector))) {
			return nextEl;
		}
		return null;
	}

	first(el: Element, selector?: string) {
		if (selector) {
			return el.querySelector(selector);
		} else {
			return el.firstElementChild;
		}
	}

	last(el: Element, selector?: string) {
		if (selector) {
			return el.querySelector(selector);
		} else {
			return el.lastElementChild;
		}
	}

	attr(el: Element, name: string, value?: string) {
		if (value !== undefined) {
			el.setAttribute(name, value);
		} else {
			return el.getAttribute(name);
		}
	}

	hidden(el: HTMLElement, value?: boolean) {
		if (value !== undefined) {
			el.hidden = value;
		} else {
			return !(
				el.offsetWidth ||
				el.offsetHeight ||
				el.getClientRects().length
			);
		}
	}

	visible(el: HTMLElement, value?: boolean) {
		if (value !== undefined) {
			el.hidden = !value;
		} else {
			return !this.hidden(el);
		}
	}

	click(el: Element, listener: (this: Element, ev: Event) => any) {
		el.addEventListener("click", listener);
	}

	on(
		el: Element,
		event: string,
		listener: (this: Element, ev: Event) => any
	) {
		el.addEventListener(event, listener);
	}

	off(
		el: Element,
		event: string,
		listener: (this: Element, ev: Event) => any
	) {
		el.removeEventListener(event, listener);
	}

	toggle(el: HTMLElement) {
		if (el.style.display == "none") {
			el.style.display = "";
		} else {
			el.style.display = "none";
		}
	}

	show(el: HTMLElement) {
		el.style.display = "";
	}

	hide(el: HTMLElement) {
		el.style.display = "none";
	}
}
