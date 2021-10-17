import type { NodeDocument } from "core-types"
import type { JSONSchema7 } from "json-schema"
import type { PartialOpenApiSchema } from "openapi-json-schema"
import { load as readYaml, dump as writeYaml } from "js-yaml"

import {
	getJsonSchemaReader,
	getJsonSchemaWriter,
	getOpenApiReader,
	getOpenApiWriter,
} from "./convert-json-schema"


const jsonSchemaFixture: JSONSchema7 = {
	definitions: {
		Foo: {
			title: "Foo type",
			type: "object",
			properties: {
				bar: { type: "string" },
				num: { type: "number" },
				int: { type: "integer" },
			},
			required: [ "bar" ],
			additionalProperties: false,
		},
	},
};

const openApiSchemaFixture: PartialOpenApiSchema = {
	info: {
		title: "Title",
		version: "1",
	},
	openapi: "3.0.0",
	paths: { },
	components: {
		schemas: {
			Foo: {
				title: "Foo type",
				type: "object",
				properties: {
					bar: { type: "string" },
					num: { type: "number" },
					int: { type: "integer" },
				},
				required: [ "bar" ],
				additionalProperties: false,
			},
		},
	},
};

const warn = jest.fn( );

describe( "convert-json-schema", ( ) =>
{
	describe( "getJsonSchemaReader", ( ) =>
	{
		it( "should have correct kind", ( ) =>
		{
			expect( getJsonSchemaReader( ).kind ).toBe( "jsc" );
		} );

		it( "should read properly", ( ) =>
		{
			expect(
				getJsonSchemaReader( ).read(
					JSON.stringify( jsonSchemaFixture ),
					{ warn }
				)
			).toStrictEqual( {
				data: {
					version: 1,
					types: [
						{
							name: 'Foo',
							title: 'Foo type',
							type: 'object',
							properties: {
								bar: {
									node: {
										type: 'string',
									},
									required: true,
								},
								num: {
									node: {
										type: 'number',
									},
									required: false,
								},
								int: {
									node: {
										type: 'integer',
									},
									required: false,
								},
							},
							additionalProperties: false,
						}
					],
				},
				convertedTypes: [ 'Foo' ],
				notConvertedTypes: [ ],
			} );
		} );
	} );

	describe( "getJsonSchemaWriter", ( ) =>
	{
		it( "should have correct kind", ( ) =>
		{
			expect( getJsonSchemaWriter( ).kind ).toBe( "jsc" );
		} );

		it( "should write properly", async ( ) =>
		{
			const doc: NodeDocument = {
				version: 1,
				types: [
					{
						name: 'Foo',
						title: 'Foo type',
						type: 'object',
						properties: {
							bar: {
								node: {
									type: 'string',
								},
								required: true,
							},
							num: {
								node: {
									type: 'number',
								},
								required: false,
							},
							int: {
								node: {
									type: 'integer',
								},
								required: false,
							},
						},
						additionalProperties: false,
					},
				],
			};

			const writer = getJsonSchemaWriter( );

			const {
				data,
				convertedTypes,
				notConvertedTypes,
			} = await writer.write( doc, { warn, rawInput: '' } );

			const out = JSON.parse( data );
			delete out.$comment;

			expect( out ).toStrictEqual( jsonSchemaFixture );
			expect( convertedTypes ).toStrictEqual( [ 'Foo' ] );
			expect( notConvertedTypes ).toStrictEqual( [ ] );
		} );
	} );

	describe( "getOpenApiReader", ( ) =>
	{
		it( "should have correct kind", ( ) =>
		{
			expect( getOpenApiReader( ).kind ).toBe( "oapi" );
		} );

		it( "should read properly (json)", ( ) =>
		{
			expect(
				getOpenApiReader( ).read(
					JSON.stringify( openApiSchemaFixture ),
					{ warn }
				)
			).toStrictEqual( {
				data: {
					version: 1,
					types: [
						{
							name: 'Foo',
							title: 'Foo type',
							type: 'object',
							properties: {
								bar: {
									node: {
										type: 'string',
									},
									required: true,
								},
								num: {
									node: {
										type: 'number',
									},
									required: false,
								},
								int: {
									node: {
										type: 'integer',
									},
									required: false,
								},
							},
							additionalProperties: false,
						}
					],
				},
				convertedTypes: [ 'Foo' ],
				notConvertedTypes: [ ],
			} );
		} );

		it( "should read properly (yaml)", ( ) =>
		{
			expect(
				getOpenApiReader( ).read(
					writeYaml( openApiSchemaFixture ),
					{ warn, filename: 'foo.yaml' }
				)
			).toStrictEqual( {
				data: {
					version: 1,
					types: [
						{
							name: 'Foo',
							title: 'Foo type',
							type: 'object',
							properties: {
								bar: {
									node: {
										type: 'string',
									},
									required: true,
								},
								num: {
									node: {
										type: 'number',
									},
									required: false,
								},
								int: {
									node: {
										type: 'integer',
									},
									required: false,
								},
							},
							additionalProperties: false,
						}
					],
				},
				convertedTypes: [ 'Foo' ],
				notConvertedTypes: [ ],
			} );
		} );
	} );

	describe( "getOpenApiWriter", ( ) =>
	{
		const getWriter = ( format: string ) =>
			getOpenApiWriter( {
				format,
				title: openApiSchemaFixture.info.title,
				version: openApiSchemaFixture.info.version,
			} );

		it( "should have correct kind", ( ) =>
		{
			expect( getWriter( 'json' ).kind ).toBe( "oapi" );
		} );

		it( "should write properly (json)", async ( ) =>
		{
			const doc: NodeDocument = {
				version: 1,
				types: [
					{
						name: 'Foo',
						title: 'Foo type',
						type: 'object',
						properties: {
							bar: {
								node: {
									type: 'string',
								},
								required: true,
							},
							num: {
								node: {
									type: 'number',
								},
								required: false,
							},
							int: {
								node: {
									type: 'integer',
								},
								required: false,
							},
						},
						additionalProperties: false,
					},
				],
			};

			const writer = getWriter( 'json' );

			const {
				data,
				convertedTypes,
				notConvertedTypes,
			} = await writer.write( doc, { warn, rawInput: '' } );

			const out = JSON.parse( data );
			delete out.info['x-comment'];

			expect( out ).toStrictEqual( openApiSchemaFixture );
			expect( convertedTypes ).toStrictEqual( [ 'Foo' ] );
			expect( notConvertedTypes ).toStrictEqual( [ ] );
		} );

		it( "should write properly (yaml)", async ( ) =>
		{
			const doc: NodeDocument = {
				version: 1,
				types: [
					{
						name: 'Foo',
						title: 'Foo type',
						type: 'object',
						properties: {
							bar: {
								node: {
									type: 'string',
								},
								required: true,
							},
							num: {
								node: {
									type: 'number',
								},
								required: false,
							},
							int: {
								node: {
									type: 'integer',
								},
								required: false,
							},
						},
						additionalProperties: false,
					},
				],
			};

			const writer = getWriter( 'yaml' );

			const {
				data,
				convertedTypes,
				notConvertedTypes,
			} = await writer.write( doc, { warn, rawInput: '' } );

			const out = readYaml( data ) as any;
			delete out.info['x-comment'];

			expect( out ).toStrictEqual( openApiSchemaFixture );
			expect( convertedTypes ).toStrictEqual( [ 'Foo' ] );
			expect( notConvertedTypes ).toStrictEqual( [ ] );
		} );
	} );
} );
