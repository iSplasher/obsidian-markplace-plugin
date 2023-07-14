import { FlexDirection, makeScene2D, Rect, Txt } from "@motion-canvas/2d";
import {
	Layout,
	Line,
	LineProps,
	Node,
	RectProps,
	Spline,
	TxtProps,
} from "@motion-canvas/2d/lib/components/";
import {
	CodeBlock,
	insert,
	word,
} from "@motion-canvas/2d/lib/components/CodeBlock";
import {
	all,
	chain,
	createRef,
	createSignal,
	DEFAULT,
	delay,
	Direction,
	loop,
	makeRef,
	map,
	Reference,
	SignalValue,
	SimpleSignal,
	slideTransition,
	tween,
	unwrap,
	waitFor,
} from "@motion-canvas/core";

const TEXT_COLOR = "grey";

type HookProps = {
	detail?: TxtProps;
	lineWidth?: LineProps["lineWidth"];
	stroke?: LineProps["stroke"];
	opacity?: LineProps["opacity"];
	spacing?: SignalValue<number>;
	content: Reference<Layout>;
	direction: "left" | "right" | "top" | "bottom";
} & Omit<RectProps, "direction">;

function Hook({
	direction,
	content,
	detail,
	lineWidth,
	stroke,
	opacity,
	spacing,
	...props
}: HookProps) {
	const spline = createRef<Spline>();

	const rectDir = createSignal<FlexDirection>("row");
	const spacingLeft = createSignal(0);
	const spacingTop = createSignal(0);
	const spacingRight = createSignal(0);
	const spacingBottom = createSignal(0);

	switch (direction) {
		case "left": {
			rectDir("row");
			spacingLeft(spacing);
			spacingRight(spacing);
			break;
		}
		case "top": {
			rectDir("column");
			spacingTop(spacing);
			spacingBottom(spacing);
			break;
		}

		case "bottom": {
			rectDir("column-reverse");
			spacingTop(spacing);
			spacingBottom(spacing);
			break;
		}
	}

	return (
		<Rect
			{...props}
			layout
			direction={rectDir}
			justifyContent={"center"}
			alignContent={"center"}
			alignItems={"center"}
		>
			<Rect textWrap>
				<Txt
					fill={TEXT_COLOR}
					opacity={() => map(0.5, 1, unwrap(opacity))}
					{...detail}
					text={() => {
						const t = unwrap(detail.text);
						const s = t ? unwrap(spacing) : 0;
						switch (direction) {
							case "left": {
								spacingLeft(s);
								break;
							}
							case "top": {
								spacingTop(s);
								break;
							}

							case "bottom": {
								spacingBottom(s);
								break;
							}
						}
						return t;
					}}
				/>
			</Rect>
			<Rect
				marginLeft={spacingLeft}
				marginTop={spacingTop}
				marginBottom={spacingBottom}
				marginRight={spacingRight}
			>
				<Spline
					layout={false}
					ref={spline}
					lineWidth={lineWidth}
					stroke={stroke}
					opacity={opacity}
					lineDash={[10, 10]}
					smoothness={0}
					points={() => {
						const s = unwrap(spacing);
						switch (direction) {
							case "left": {
								const contentHeight =
									content().height() / 2 + s;

								return [
									[s, -(contentHeight + s / 2)],
									[0, -(contentHeight + s / 2)],
									[0, contentHeight],
									[s, contentHeight],
								];
							}
							case "top": {
								const contentWidth = content().width();

								return [
									[-(contentWidth / 2 + s / 2), s],
									[-(contentWidth / 2 + s / 2), 0],
									[contentWidth / 2 + s / 2, 0],
									[contentWidth / 2 + s / 2, s],
								];
							}
							case "bottom": {
								const contentWidth = content().width();

								return [
									[-(contentWidth / 2 + s / 2), -s],
									[-(contentWidth / 2 + s / 2), 0],
									[contentWidth / 2 + s / 2, 0],
									[contentWidth / 2 + s / 2, -s],
								];
							}
						}
					}}
				/>
				<Line
					layout={false}
					ref={spline}
					lineWidth={lineWidth}
					opacity={opacity}
					stroke={stroke}
					points={() => {
						const detailText = unwrap(detail?.text);

						if (!detailText) return [];

						const s = unwrap(spacing);

						switch (direction) {
							case "left": {
								return [
									[-s / 2, 0],
									[0, 0],
								];
							}
							case "top": {
								return [
									[0, -s / 2],
									[0, 0],
								];
							}
							case "bottom": {
								return [
									[0, s / 2],
									[0, 0],
								];
							}
						}
					}}
				/>
			</Rect>
		</Rect>
	);
}

type BorderHookRectProps = RectProps & {
	detail?: TxtProps;
	lineWidth?: LineProps["lineWidth"];
	stroke?: LineProps["stroke"];
	hookOpacity?: HookProps["opacity"];
	hookSpacing?: HookProps["spacing"];
	hookDirection?: HookProps["direction"];
};

function BorderHookRect({
	hookDirection = "left",
	lineWidth = 2,
	stroke = "grey",
	hookSpacing = 40,
	hookOpacity = 100,
	detail,
	children,
	...props
}: BorderHookRectProps) {
	const main = createRef<Rect>();
	const contentRect = createRef<Rect>();

	const rectDir = createSignal<FlexDirection>("row");

	switch (hookDirection) {
		case "left": {
			rectDir("row");
			break;
		}
		case "top": {
			rectDir("column");
			break;
		}
		case "bottom": {
			rectDir("column-reverse");
			break;
		}
	}

	return (
		<Rect {...props} layout direction={rectDir} ref={main}>
			<Hook
				direction={hookDirection}
				stroke={stroke}
				lineWidth={lineWidth}
				content={contentRect}
				spacing={hookSpacing}
				opacity={hookOpacity}
				detail={detail}
			/>
			<Rect ref={contentRect}>{children}</Rect>
		</Rect>
	);
}

interface BlockRefs {
	topCode: CodeBlock;
	middleCode: CodeBlock;
	bottomCode: CodeBlock;

	commentTop: CodeBlock;
	commentMiddle: CodeBlock;
	commentBottom: CodeBlock;
}

function Block({
	refs,
	hookDetail,
	hookOpacity,
	hookSpacing,
}: { refs: BlockRefs; hookDetail: BorderHookRectProps["detail"] } & Pick<
	BorderHookRectProps,
	"hookSpacing" | "hookOpacity"
>) {
	// 	yield* ray().start(1, 1);
	//   yield* ray().start(0).end(0).start(1, 1);

	return (
		<BorderHookRect
			hookDirection="left"
			detail={hookDetail}
			hookOpacity={hookOpacity}
			hookSpacing={hookSpacing}
			justifyContent={"center"}
			alignContent={"center"}
		>
			<Rect layout direction={"column"} justifyContent={"center"}>
				<CodeBlock
					ref={makeRef(refs, "topCode")}
					language="md"
					code={``}
				/>
				<Rect marginTop={20} layout direction={"column"}>
					<CodeBlock
						ref={makeRef(refs, "commentTop")}
						language="md"
						code={``}
					/>
					<Rect paddingLeft={50}>
						<CodeBlock
							ref={makeRef(refs, "middleCode")}
							language="js"
							code={``}
						/>
					</Rect>
					<CodeBlock
						ref={makeRef(refs, "commentBottom")}
						language="md"
						code={``}
					/>
				</Rect>
				<CodeBlock
					ref={makeRef(refs, "bottomCode")}
					language="md"
					code={``}
				/>
			</Rect>
		</BorderHookRect>
	);
}

export default makeScene2D(function* (view) {
	const main = createRef<Rect>();

	const leftDetail = createRef<Txt>();
	const middleDetail = createRef<Txt>();
	const rightDetail = createRef<Txt>();

	const leftBlock = {} as BlockRefs;
	const rightBlock = {} as BlockRefs;

	const leftHookOpacity = createSignal(0);
	const rightHookOpacity = createSignal(0);
	const leftHookDetail = createSignal("");
	const rightHookDetail = createSignal("");

	view.add(
		<Rect layout direction={"row"} justifyContent={"center"} ref={main}>
			<Rect width={0} textWrap>
				<Txt ref={leftDetail} fontSize={36} />
			</Rect>

			<Block
				hookDetail={{
					text: leftHookDetail,
				}}
				hookOpacity={leftHookOpacity}
				refs={leftBlock}
			/>
			<Rect width={0} textWrap>
				<Txt ref={middleDetail} fontSize={36} />
			</Rect>

			<Block
				hookDetail={{ text: rightHookDetail }}
				hookOpacity={rightHookOpacity}
				refs={rightBlock}
			/>

			<Rect width={0} textWrap>
				<Txt ref={rightDetail} fontSize={36} />
			</Rect>
		</Rect>
	);

	yield* slideTransition(Direction.Right);

	//

	const START_TAG = "%%{";
	const END_TAG = "}%%";
	const END_TOKEN = "end";
	const blockID = "Your Block ID";

	let preSrc = ``;
	let postSrc = ``;

	// yield detail().text(
	// 	"The start tag is used to identify a block of code that can be edited."
	// );

	yield* delay(
		0,
		all(
			leftBlock.topCode.edit(0.5)`${preSrc}${insert(
				`${START_TAG} ${blockID} ${END_TAG}`
			)}${postSrc}`
		)
	);

	yield* chain(
		leftBlock.topCode.selection(word(0, 0, START_TAG.length), 1),
		leftBlock.topCode.selection(
			word(0, START_TAG.length + 1, blockID.length),
			1
		),
		leftBlock.topCode.selection(
			word(0, START_TAG.length + 1 + blockID.length + 1, END_TAG.length),
			1
		),
		leftBlock.topCode.selection(DEFAULT, 0.5)
	);

	const opc1 = createSignal(0);
	const topCodeHook = (
		<BorderHookRect
			hookDirection="top"
			detail={{ text: "Start of block" }}
			hookOpacity={opc1}
		/>
	);
	yield* wrapNode(leftBlock.topCode, topCodeHook, opc1);
	yield* tween(1, (v) => {
		opc1(v);
	});

	preSrc = "";
	postSrc = "";

	yield* delay(
		0,
		all(
			leftBlock.bottomCode.edit(0.5)`${preSrc}${insert(
				`${START_TAG} end ${END_TAG}`
			)}${postSrc}`
		)
	);

	const opc2 = createSignal(0);
	const bottomCodeHook = (
		<BorderHookRect
			hookDirection="bottom"
			detail={{ text: "End of block" }}
			hookOpacity={opc2}
		/>
	);
	yield* wrapNode(leftBlock.bottomCode, bottomCodeHook, opc2);

	const endHighlight = word(0, END_TOKEN.length + 1, END_TOKEN.length);

	yield* chain(
		leftBlock.bottomCode.selection(endHighlight, 1.5),

		loop(3, () =>
			chain(
				delay(0, leftBlock.bottomCode.selection(endHighlight, 0)),
				delay(
					0.2,
					leftBlock.bottomCode.selection(
						word(0, START_TAG.length, 0.2),
						1
					)
				)
			)
		),
		delay(0, leftBlock.bottomCode.selection(DEFAULT, 0.5))
	);

	yield* all(
		replaceNode(topCodeHook, leftBlock.topCode, opc1),
		replaceNode(bottomCodeHook, leftBlock.bottomCode, opc1)
	);

	yield* tween(1, (v) => {
		leftHookOpacity(v);
		if (v === 1) {
			leftHookDetail("Block");
		}
	});

	yield* all(
		leftBlock.topCode.selection(word(0, START_TAG.length, 0.2), 1),
		leftBlock.bottomCode.selection(word(0, START_TAG.length, 0.2), 1)
	);

	yield* delay(
		0,
		all(
			chain(
				leftBlock.commentTop.edit(0.5)`${insert("%% ")}`,
				leftBlock.commentTop.selection(word(0, 2, 1), 0.5)
			),
			chain(
				leftBlock.commentBottom.edit(0.5)`${insert("%%")}`,
				leftBlock.commentBottom.selection(word(0, 2, 1), 0.5)
			)
		)
	);

	preSrc = "";
	postSrc = "";

	yield* delay(
		0.5,
		all(
			leftBlock.middleCode.edit(1)`${preSrc}${insert(
				`this.mp.text("## Hello World!")`
			)}${postSrc}`
		)
	);

	yield* waitFor(3);
});

function* wrapNode(
	node: Node,
	parent: Node,
	parentOpacity?: SimpleSignal<number>,
	nodeOpacity?: SimpleSignal<number>
) {
	// get index of node
	const index = Array.from(node.parent().children()).indexOf(node);

	if (index !== -1) {
		node.parent().insert(parent, index);
		node.reparent(parent);
	}

	if (nodeOpacity || parentOpacity) {
		yield* tween(1, (v) => {
			if (nodeOpacity) nodeOpacity(v);
			if (parentOpacity) parentOpacity(v);
		});
	}
}

function* replaceNode(
	node: Node,
	replacement: Node,
	replacementOpacity?: SimpleSignal<number>,
	nodeOpacity?: SimpleSignal<number>
) {
	// get index of node
	const index = Array.from(node.parent().children()).indexOf(node);

	if (nodeOpacity || replacementOpacity) {
		yield* tween(1, (v) => {
			if (nodeOpacity) nodeOpacity(map(1, 0, v));
			if (replacementOpacity) replacementOpacity(map(1, 0, v));
		});
	}

	if (index !== -1) {
		const parent = node.parent();
		node.remove();
		parent.insert(replacement, index);
	}
}
