import { makeScene2D, Rect } from '@motion-canvas/2d';
import {
  CodeBlock,
  edit,
  insert,
  lines,
  remove,
  word,
} from '@motion-canvas/2d/lib/components/CodeBlock';
import {
  chain,
  createRef,
  DEFAULT,
  delay,
  Direction,
  sequence,
  slideTransition,
} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
	const main = createRef<Rect>();
	const code = createRef<CodeBlock>();

	yield view.add(
		<Rect ref={main}>
			<CodeBlock
				ref={code}
				code={`
				console.log('Hello World!')
					// more indented
				  // less indented
				`}
			/>
		</Rect>
	);

	yield* slideTransition(Direction.Top);

	// second line only
	yield* chain(
		code().selection(lines(1), 1),
		// second and third line (line 1 to line 2)
		code().selection(lines(1, 2), 1),
		code().selection(lines(0), 1)
	);

	yield* sequence(
		1,
		code().selection(word(0, 0, 4), 1),
		// highlight all lines
		code().selection(DEFAULT, 1)
	);

	// duration of 1.2 seconds
	yield* code().edit(1.2)`var myBool${insert(" = true")};`;
	yield* delay(1, code().edit(1.2)`var myBool${remove(" = true")};`);
	yield* delay(1, code().edit(1.2)`var myBool${insert(" = false")};`);
	yield* delay(1, code().edit(1.2)`var myBool = ${edit("false", "true")};`);

	yield* delay(
		1,
		code().edit(1.2)`${edit("var", "const")} myBool${remove(" = true")};`
	);
});
