import { makeConverter, getTypeScriptReader, getOpenApiWriter } from '../'


describe( 'ts-to-openapi', ( ) =>
{
	it( 'typescript to openapi', async ( ) =>
	{
		const input = `
			type Thing = {
				x: 6
				y: string
			}

			export type Foo = {
				a: string
				b: null
				c: number
				d: boolean
				e: Thing
			}
		`;

		const { convert } = makeConverter(
			getTypeScriptReader( ),
			getOpenApiWriter( {
				format: 'yaml',
				title: 'My API',
				version: 'v1'
			} )
		);

		const { data } = await convert( { data: input } );

		expect( data ).toMatchSnapshot( );
	} );

	it( 'ensure descriptions are forwarded', async ( ) =>
	{
		const input = `
			export type Point = {
				/** The distance from the left in mm */
				x: number;
				/** The distance from the top in mm */
				y: number;
			};
		`;

		const { convert } = makeConverter(
			getTypeScriptReader( ),
			getOpenApiWriter( {
				format: 'yaml',
				title: 'My API',
				version: 'v1'
			} )
		);

		const { data } = await convert( { data: input } );

		expect( data ).toMatchSnapshot( );
	} );
} );
