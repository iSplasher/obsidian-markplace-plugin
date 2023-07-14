import { makeScene2D, Rect } from '@motion-canvas/2d';
import { Direction, slideTransition, waitFor } from '@motion-canvas/core';

export default makeScene2D(function* (view) {
	// set up the scene:
	view.add(<Rect></Rect>);

	// perform a slide transition to the left:
	yield* slideTransition(Direction.Left);

	// proceed with the animation
	yield* waitFor(3);
});
