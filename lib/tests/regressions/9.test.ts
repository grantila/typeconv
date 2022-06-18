import { getJsonSchemaReader, getOpenApiWriter, makeConverter } from "../.."

const testObject = {
	"type": "object",
	"properties": {
		"name": { "minLength": 5, "maxLength": 10, "type": "string" },
		"creationDate": { "format": "date-time", "type": "string" }
	},
	"required": ["name", "creationDate"]
}

const schemas = {
	"definitions": {
		"testType": testObject
	}
};

describe( 'regressions', ( ) =>
{
	it( 'issue #9', async ( ) =>
	{
		const reader = getJsonSchemaReader( );
		const writer = getOpenApiWriter( {
			format: 'yaml',
			title: 'Testconverter',
			version: 'v1',
			schemaVersion: '3.0.0',
		} );
		const { convert } = makeConverter( reader, writer );
		const { data: output } =
			await convert( { data: JSON.stringify( schemas ) } );

		expect( output ).toMatchSnapshot( );
	} );
} );
