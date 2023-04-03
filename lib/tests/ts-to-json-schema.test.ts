import { expect, describe, it } from "@jest/globals"

import {
	makeConverter,
	getTypeScriptReader,
	getJsonSchemaWriter,
} from '../index.js'


describe( 'ts-to-json-schema', ( ) =>
{
    // https://github.com/grantila/typeconv/issues/15
    // https://github.com/grantila/typeconv/issues/35
	it( 'interface heritage', async ( ) =>
	{
		const input = `
			interface Bar {
				b: string;
			}

			export interface Foo extends Bar {
				f: number;
			}
		`;

		const { convert } = makeConverter(
			getTypeScriptReader( ),
			getJsonSchemaWriter( ),
            {
                mergeObjects: true,
            }
		);

		const { data } = await convert( { data: input } );

		expect( data ).toMatchSnapshot( );
	} );

    // https://github.com/grantila/typeconv/issues/35
	it( 'type intersection', async ( ) =>
	{
		const input = `
			type Bar = {
				b: string;
			}

			export type Foo = Bar & {
				f: number;
			}
		`;

		const { convert } = makeConverter(
			getTypeScriptReader( ),
			getJsonSchemaWriter( ),
            {
                mergeObjects: true,
            }
		);

		const { data } = await convert( { data: input } );

		expect( data ).toMatchSnapshot( );
	} );
} );
