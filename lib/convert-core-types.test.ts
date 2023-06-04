import type { NodeDocument } from "core-types"
import { jest } from "@jest/globals"

import {
	getCoreTypesReader,
	getCoreTypesWriter,
} from "./convert-core-types.js"


const fixture: NodeDocument = {
	version: 1,
	types: [
		{
			name: 'Foo',
			title: 'The foo',
			type: 'string',
		},
	],
};

const warn = jest.fn( );

describe( "convert-core-types", ( ) =>
{
	describe( "getCoreTypesReader", ( ) =>
	{
		it( "should have correct kind", ( ) =>
		{
			expect( getCoreTypesReader( ).kind ).toBe( "ct" );
		} );

		it( "should read properly", ( ) =>
		{
			expect(
				getCoreTypesReader( ).read(
					JSON.stringify( fixture ),
					{ warn }
				)
			).toStrictEqual( {
				data: fixture,
				convertedTypes: [ 'Foo' ],
				notConvertedTypes: [ ],
			} );
		} );
	} );

	describe( "getCoreTypesWriter", ( ) =>
	{
		it( "should have correct kind", ( ) =>
		{
			expect( getCoreTypesWriter( ).kind ).toBe( "ct" );
		} );

		it( "should write properly", async ( ) =>
		{
			const {
				data,
				convertedTypes,
				notConvertedTypes,
			} = await getCoreTypesWriter( ).write(
				fixture,
				{ warn, rawInput: '' }
			);

			const resData = JSON.parse( data );

			expect( resData ).toStrictEqual( fixture );
			expect( convertedTypes ).toStrictEqual( [ 'Foo' ] );
			expect( notConvertedTypes ).toStrictEqual( [ ] );
		} );
	} );
} );
