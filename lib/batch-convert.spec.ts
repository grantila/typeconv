import path from "path"
import { fileURLToPath } from "url"

import { batchConvert, batchConvertGlob } from './batch-convert.js'
import { Converter, makeConverter } from './converter.js'
import { withConsoleLog, withConsoleMock } from '../test/utils.js'
import { getTypeScriptReader } from './convert-typescript.js'
import { getJsonSchemaWriter } from './convert-json-schema.js'


const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

const fixtureDir = path.join( __dirname, '..', 'fixtures' );

function makeMockConverter( ): Converter
{
	const reader = getTypeScriptReader( );
	const writer = getJsonSchemaWriter( );
	return makeConverter( reader, writer, { cwd: fixtureDir } );
}

describe( "batch-convert", ( ) =>
{
	it( "batchConvert", withConsoleLog( async ( { log } ) =>
	{
		const converter = makeMockConverter( );
		await batchConvert(
			converter,
			[
				path.join( fixtureDir, 'types1.ts' ),
				path.join( fixtureDir, 'sub', 'types2.ts' ),
			],
			{
				outputExtension: '-',
				concurrency: 1,
			}
		);

		expect( log.mock.calls.length ).toBe( 2 );
		const types1 = JSON.parse( log.mock.calls[ 0 ] );
		const types2 = JSON.parse( log.mock.calls[ 1 ] );

		expect( types1 ).toMatchSnapshot( );
		expect( types2 ).toMatchSnapshot( );
	} ) );

	it( "batchConvert verbose", withConsoleMock( async ( { log, error } ) =>
	{
		const converter = makeMockConverter( );
		await batchConvert(
			converter,
			[
				path.join( fixtureDir, 'types1.ts' ),
				path.join( fixtureDir, 'sub', 'types2.ts' ),
			],
			{
				outputExtension: '-',
				concurrency: 1,
				verbose: true,
			}
		);

		expect( log.mock.calls.length ).toBe( 2 );
		const types1 = JSON.parse( log.mock.calls[ 0 ] );
		const types2 = JSON.parse( log.mock.calls[ 1 ] );

		expect( types1 ).toMatchSnapshot( );
		expect( types2 ).toMatchSnapshot( );

		expect( error.mock.calls.length ).toBe( 3 );
		expect(
			error.mock.calls
			.map( ( line, i ) =>
				i === 0
				// Absolute local files system, must be aligned with CI/CD
				? path.basename( line[ 0 ] )
				: line
			)
		).toMatchSnapshot( );
	}, [ 'log', 'error' ] ) );

	it( "batchConvertGlob", withConsoleLog( async ( { log } ) =>
	{
		const converter = makeMockConverter( );
		await batchConvertGlob(
			converter,
			[ path.join( fixtureDir, '**/*.ts' ) ],
			{
				outputExtension: '-',
				concurrency: 1,
				filesTransform: files => files.sort( ), // be deterministic
			}
		);

		expect( log.mock.calls.length ).toBe( 2 );
		const types1 = JSON.parse( log.mock.calls[ 0 ] );
		const types2 = JSON.parse( log.mock.calls[ 1 ] );

		expect( types1 ).toMatchSnapshot( );
		expect( types2 ).toMatchSnapshot( );
	} ) );
} );
