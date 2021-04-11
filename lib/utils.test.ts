import { ensureType, stringify } from './utils'

describe( "utils", ( ) =>
{
	describe( "stringify", ( ) =>
	{
		it( "should stringify string", ( ) =>
		{
			expect( stringify( "foo" ) ).toBe( '"foo"' );
		} );

		it( "should stringify object", ( ) =>
		{
			expect( stringify( { foo: "bar" } ) ).toBe( '{\n  "foo": "bar"\n}' );
		} );
	} );

	describe( "ensureType", ( ) =>
	{
		it( "should fail on invalida data", ( ) =>
		{
			const consoleErrorOrig = console.error;

			const orElse = jest.fn( );
			const consoleError = jest.fn( );
			console.error = consoleError;

			const ret =
				ensureType( "foo", "bars", [ "bar", "baz" ], orElse as any );

			console.error = consoleErrorOrig;

			expect( ret ).toBe( undefined );
			expect( orElse ).toHaveBeenCalledTimes( 1 );
			expect( consoleError ).toHaveBeenCalledWith( 'Invalid bars: foo' );
		} );

		it( "should succeed if valid data", ( ) =>
		{
			const consoleErrorOrig = console.error;

			const orElse = jest.fn( );
			const consoleError = jest.fn( );
			console.error = consoleError;

			const ret =
				ensureType( "bar", "bars", [ "bar", "baz" ], orElse as any );

			console.error = consoleErrorOrig;

			expect( ret ).toBe( true );
			expect( orElse ).not.toHaveBeenCalled( );
			expect( consoleError ).not.toHaveBeenCalled( );
		} );
	} );
} );
