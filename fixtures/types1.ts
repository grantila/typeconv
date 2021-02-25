
export interface Foo
{
	// Name of the bar
	bar: string;
	/**
	 * A baz is a number of another Foo
	 *
	 * @see baz documentation at http://documentation.yada
	 */
	baz: number | Foo;
}

export interface Foo2
{
	// The bak is a bit stream
	bak: Array< boolean >;
}
