import * as path from 'path'

import { makeConverter } from './converter'
import {
	getJsonSchemaReader,
	getJsonSchemaWriter,
	getOpenApiWriter,
} from './convert-json-schema'
import { getTypeScriptWriter } from './convert-typescript'
import { getGraphQLReader, getGraphQLWriter } from './convert-graphql'
import { getSureTypeReader, getSureTypeWriter } from './convert-suretype'
import { withConsoleWarn } from '../test/utils'


const fixturesDir = path.resolve( __dirname, 'fixtures' );

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
			async ( { warn } ) =>
		{
			const warnFn = jest.fn( );
			const { convert } = makeConverter(
				getJsonSchemaReader( ),
				getGraphQLWriter( { warn: warnFn } ),
			);
			const example = {
				definitions: {
					foo: { type: 'null' }
				}
			};
			await convert( { data: JSON.stringify( example, null, 4 ) } );

			expect( warnFn ).toHaveBeenCalledWith(
				"Type 'null' not supported",
				expect.any( Error )
			);
			expect( warn ).toHaveBeenCalledTimes( 0 );
		} ) );

		it( "should invoke console.warn by default", withConsoleWarn(
			async ( { warn } ) =>
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

			expect( warn ).toHaveBeenCalledWith(
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

		it( "should run graph if necessary (st->oapi)", async ( ) =>
		{
			const { convert } = makeConverter(
				getSureTypeReader( ),
				getOpenApiWriter( {
					format: 'yaml',
					title: 'Title',
					version: '1',
					schemaVersion: '3.0.0',
				} ),
				{ shortcut: true }
			);
			const stFile = path.resolve( fixturesDir, 'validator.st.ts' );

			const { data, in: _in, out } =
				await convert( { filename: stFile, cwd: '/' } );

			const expectedConversionResult = {
				convertedTypes: [ 'Foo' ],
				notConvertedTypes: [ ],
			};
			expect( _in ).toStrictEqual( expectedConversionResult );
			expect( out ).toStrictEqual( expectedConversionResult );
			expect( data ).toMatchSnapshot( );
		} );


		it( "should run graph if necessary (gql->st)", async ( ) =>
		{
			const { convert } = makeConverter(
				getGraphQLReader( ),
				getSureTypeWriter( { } ),
				{ shortcut: true }
			);

			const { data, in: _in, out } =
				await convert( {
					data: `
						"""
						The Foo type
						"""
						type Foo {
							"""
							This is the integer thing

							@default 55
							"""
							int: Int
							str: String!
							"Excellent array of strings"
							stra: [String!]!
						}
					`,
				} );

			const expectedConversionResult = {
				convertedTypes: [ 'Foo' ],
				notConvertedTypes: [ ],
			};
			expect( _in ).toStrictEqual( expectedConversionResult );
			expect( out ).toStrictEqual( expectedConversionResult );
			expect( data ).toMatchSnapshot( );
		} );
	} );
} );
