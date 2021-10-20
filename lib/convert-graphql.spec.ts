import type { NodeDocument } from "core-types"
import { getGraphQLReader, getGraphQLWriter } from "./convert-graphql"


const schema = `"Foo type"
type Foo {
  bar: String!
  num: Float
  int: Int
}
`;

const warn = jest.fn( );

describe( "convert-graphql", ( ) =>
{
	describe( "getGraphQLReader", ( ) =>
	{
		it( "should have correct kind", ( ) =>
		{
			expect( getGraphQLReader( ).kind ).toBe( "gql" );
		} );

		it( "should read properly", ( ) =>
		{
			expect(
				getGraphQLReader( ).read( schema, { warn } )
			).toStrictEqual( {
				data: {
					version: 1,
					types: [
						{
							name: 'Foo',
							title: 'Foo',
							description: 'Foo type',
							type: 'object',
							loc: expect.anything( ),
							properties: {
								bar: {
									node: {
										type: 'string',
										title: 'Foo.bar',
										loc: expect.anything( ),
									},
									required: true,
								},
								num: {
									node: {
										type: 'number',
										title: 'Foo.num',
										loc: expect.anything( ),
									},
									required: false,
								},
								int: {
									node: {
										type: 'integer',
										title: 'Foo.int',
										loc: expect.anything( ),
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

	describe( "getGraphQLWriter", ( ) =>
	{
		it( "should have correct kind", ( ) =>
		{
			expect( getGraphQLWriter( ).kind ).toBe( "gql" );
		} );

		it( "should write properly", async ( ) =>
		{
			const doc: NodeDocument = {
				version: 1,
				types: [
					{
						name: 'Foo',
						title: 'Foo',
						description: 'Foo type',
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

			const writer = getGraphQLWriter( { includeComment: false } );

			const {
				data,
				convertedTypes,
				notConvertedTypes,
			} = await writer.write( doc, { warn, rawInput: '' } );

			expect( data ).toStrictEqual( schema );
			expect( convertedTypes ).toStrictEqual( [ 'Foo' ] );
			expect( notConvertedTypes ).toStrictEqual( [ ] );
		} );
	} );
} );
