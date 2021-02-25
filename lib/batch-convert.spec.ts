import * as path from 'path'

import { batchConvert, batchConvertGlob } from './batch-convert'
import { Converter, makeConverter } from './converter'
import { withConsoleLog } from '../test/utils'
import { getTypeScriptReader } from './convert-typescript'
import { getJsonSchemaWriter } from './convert-json-schema'


const fixtureDir = path.join( __dirname, '..', 'fixtures' );

function makeMockConverter( ): Converter
{
	const reader = getTypeScriptReader( );
	const writer = getJsonSchemaWriter( );
	return makeConverter( reader, writer, { cwd: fixtureDir } );
}

describe( "batch-convert", ( ) =>
{
	it( "batchConvert", withConsoleLog( async ( logMock ) =>
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

		expect( logMock.mock.calls.length ).toBe( 2 );
		const types1 = JSON.parse( logMock.mock.calls[ 0 ] );
		const types2 = JSON.parse( logMock.mock.calls[ 1 ] );

		expect( types1 ).toMatchSnapshot( );
		expect( types2 ).toMatchSnapshot( );
	} ) );

	it( "batchConvertGlob", withConsoleLog( async ( logMock ) =>
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

		expect( logMock.mock.calls.length ).toBe( 2 );
		const types1 = JSON.parse( logMock.mock.calls[ 0 ] );
		const types2 = JSON.parse( logMock.mock.calls[ 1 ] );

		expect( types1 ).toMatchSnapshot( );
		expect( types2 ).toMatchSnapshot( );
	} ) );
} );
