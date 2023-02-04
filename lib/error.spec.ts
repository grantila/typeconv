import { UnsupportedError } from "core-types"

import { formatError, formatCoreTypesError } from "./error.js"

describe( "error", ( ) =>
{
	it( "formatError should fallback to error message", ( ) =>
	{
		const output = formatError( "foo message" );
		expect( output ).toEqual( "foo message" );
	} );

	it( "formatError should properly display errors", ( ) =>
	{
		const output = formatError(
			"foo message",
			{
				source: "type X = bad type;",
				loc: { start: 13, end: 17 },
			}
		);
		expect( output ).toMatchSnapshot( );
	} );

	it( "formatCoreTypesError should fallback to error message", ( ) =>
	{
		const output = formatCoreTypesError( new Error( "foo error" ) );
		expect( output ).toEqual( "foo error" );
	} );

	it( "formatCoreTypesError should display nice error message", ( ) =>
	{
		const err = new UnsupportedError(
			"foo error",
			{
				source: "type X = bad type;",
				loc: { start: 13, end: 17 },
			}
		);
		const output = formatCoreTypesError( err );
		expect( output ).toMatchSnapshot( );
	} );
} );
