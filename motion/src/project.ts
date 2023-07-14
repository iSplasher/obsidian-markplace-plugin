import { makeProject } from '@motion-canvas/core';

import syntax from './scenes/syntax?scene';

export default makeProject({
	scenes: [syntax],
	variables: {
		myVeriable: "Hello World!",
	},
});
