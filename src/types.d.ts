declare type Unwrap<T> = T extends Array<infer U>
	? U
	: T extends Promise<infer U>
	? U
	: T extends (...args: any) => Promise<infer U>
	? U
	: T extends (...args: any) => infer U
	? U
	: T;

declare type Unwrap2<T> = T extends Map<infer A, infer B> ? [A, B] : T;
