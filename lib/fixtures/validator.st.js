import { suretype, v } from 'suretype'

export const myval = suretype(
	{ name: 'Foo', description: 'This is Foo' },
	v.object( {
		gt5: v.number( ).gt( 5 ),
		gte5: v.number( ).gte( 5 ),
	} ),
);
