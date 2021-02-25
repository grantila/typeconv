import { makeConverter } from './converter'
import {
	getJsonSchemaReader,
	getJsonSchemaWriter,
	getOpenApiWriter,
} from './convert-json-schema'
import { getTypeScriptWriter } from './convert-typescript'
import { getGraphQLWriter } from './convert-graphql'
import { withConsoleWarn } from '../test/utils'

describe( "converter", ( ) =>
{
	it( "self-reading and writing JSON Schema", async ( ) =>
	{
		const { convert } = makeConverter(
			getJsonSchemaReader( ),
			getJsonSchemaWriter( ),
		);
		const example = {
			definitions: {
				foo: { type: 'string' }
			}
		};
		const { data: out } =
			await convert( { data: JSON.stringify( example, null, 4 ) } );

		expect( JSON.parse( out ) ).toMatchObject( example );
	} );

	describe( "json-schema-to-ts", ( ) =>
	{
		it( "self-reading and writing JSON Schema", async ( ) =>
		{
			const { convert } = makeConverter(
				getJsonSchemaReader( ),
				getTypeScriptWriter( {
					noDescriptiveHeader: true,
					noDisableLintHeader: true,
				} ),
			);
			const example = {
				definitions: {
					foo: { type: 'string' }
				}
			};
			const { data: out } =
				await convert( { data: JSON.stringify( example, null, 4 ) } );

			expect( out ).toMatchSnapshot( );
		} );
	} );

	describe( "warn", ( ) =>
	{
		it( "should invoke warn function when present", withConsoleWarn(
			async ( consoleWarn ) =>
		{
			const warn = jest.fn( );
			const { convert } = makeConverter(
				getJsonSchemaReader( ),
				getGraphQLWriter( { warn } ),
			);
			const example = {
				definitions: {
					foo: { type: 'null' }
				}
			};
			await convert( { data: JSON.stringify( example, null, 4 ) } );

			expect( warn ).toHaveBeenCalledWith(
				"Type 'null' not supported",
				expect.any( Error )
			);
			expect( consoleWarn ).toHaveBeenCalledTimes( 0 );
		} ) );

		it( "should invoke console.warn by default", withConsoleWarn(
			async ( consoleWarn ) =>
		{
			const { convert } = makeConverter(
				getJsonSchemaReader( ),
				getGraphQLWriter( ),
			);
			const example = {
				definitions: {
					foo: { type: 'null' }
				}
			};
			await convert( { data: JSON.stringify( example, null, 4 ) } );

			expect( consoleWarn ).toHaveBeenCalledWith(
				"Type 'null' not supported"
			);
		} ) );
	} );

	describe( "shortcut", ( ) =>
	{
		it( "should run shortcut if possible", async ( ) =>
		{
			const { convert } = makeConverter(
				getJsonSchemaReader( ),
				getOpenApiWriter( {
					format: 'yaml',
					title: 'Title',
					version: '1',
					schemaVersion: '3.0.0',
				} ),
				{ shortcut: true }
			);
			const example = {
				definitions: {
					foo: { type: 'string' }
				}
			};
			const { data: out } =
				await convert( { data: JSON.stringify( example, null, 4 ) } );

			expect( out ).toMatchSnapshot( );
		} );
	} );
} );
