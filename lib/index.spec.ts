import {
	makeConverter,
	getTypeScriptReader,
	getJsonSchemaWriter,
} from "./index.js"


describe( "index", ( ) =>
{
	it( "", async ( ) =>
	{
		const converter =
			makeConverter( getTypeScriptReader( ), getJsonSchemaWriter( ) );

		const { data } =
			await converter.convert( {
				data: 'export type Foo = number | string;'
			} );

		expect( JSON.parse( data ) ).toStrictEqual( {
			$comment: expect.anything( ),
			definitions: {
				Foo: { type: [ 'number', 'string' ], title: 'Foo' },
			},
		} );
	} );
} );
