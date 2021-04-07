import {
	convertJsonSchemaToCoreTypes,
	convertCoreTypesToJsonSchema,
	convertOpenApiToCoreTypes,
	convertCoreTypesToOpenApi,
	jsonSchemaDocumentToOpenApi,
	openApiToJsonSchema,
} from "core-types-json-schema"
import {
	JsonSchemaDocumentToOpenApiOptions,
	PartialOpenApiSchema,
} from "openapi-json-schema"
import { load as readYaml, dump as writeYaml } from "js-yaml"
import * as path from "path"

import { stringify } from "./utils"
import { Reader, ReaderOptions } from "./reader"
import { Writer } from "./writer"
import { userPackage, userPackageUrl } from "./package"
import { registerReader, registerWriter } from "./format-graph"


function maybeYamlReader( data: string, { warn, filename }: ReaderOptions )
: string | PartialOpenApiSchema
{
	const file = filename?.toLowerCase( ) ?? '';
	const isYaml = file.endsWith( 'yml' ) || file.endsWith( 'yaml' );

	const input = isYaml
		? readYaml(
			data,
			{
				filename,
				onWarning( { message, stack } )
				{
					warn( message, { blob: { stack } } );
				},
			}
		) as PartialOpenApiSchema
		// TODO: Maybe test if JSON parsing fails, and fallback to yaml,
		//       despite no filename match
		: data;

	return input;
}

export function getJsonSchemaReader( ): Reader
{
	return {
		kind: 'jsc',
		read( schema )
		{
			return convertJsonSchemaToCoreTypes( schema );
		},
	};
}

export function getJsonSchemaWriter( ): Writer
{
	return {
		kind: 'jsc',
		write( doc, { filename, sourceFilename } )
		{
			const { data: schemaObject, ...info } =
				convertCoreTypesToJsonSchema(
					doc,
					{ filename, sourceFilename, userPackage, userPackageUrl }
				);
			return {
				data: stringify( schemaObject ),
				...info,
			};
		},
		shortcut: {
			oapi( schema, readerOptions )
			{
				const openApiSchema = maybeYamlReader( schema, readerOptions );
				const jsonSchema = openApiToJsonSchema( openApiSchema );
				return {
					data: stringify( jsonSchema ),
					convertedTypes:
						Object.keys( jsonSchema.definitions ?? { } ),
					notConvertedTypes: [ ],
				};
			}
		},
	};
}

export function getOpenApiReader( ): Reader
{
	return {
		kind: 'oapi',
		read( schema, readerOptions )
		{
			const openApiSchema = maybeYamlReader( schema, readerOptions );
			return convertOpenApiToCoreTypes( openApiSchema );
		},
	};
}

export interface OpenAPIWriterOptions
	extends JsonSchemaDocumentToOpenApiOptions
{
	format: string; // 'yaml' | 'json'
}

export function getOpenApiWriter(
	{ format, ...openApiOptions }: OpenAPIWriterOptions
)
: Writer
{
	const formatOutput = ( data: unknown ) =>
		( format === 'yaml' || format === 'yml' )
		? writeYaml( data )
		: stringify( data );

	const getOpenApiOptions = ( filename?: string ) => ( {
		...openApiOptions,
		title:
			openApiOptions.title ??
			(
				filename
				? `Converted from ${path.basename( filename )} with typeconv`
				: 'Converted with typeconv'
			),
		version: openApiOptions.version ?? '1',
	} );

	return {
		kind: 'oapi',
		write( doc, { filename, sourceFilename } )
		{
			const { data: schemaObject, ...info } =
				convertCoreTypesToOpenApi(
						doc,
						{
							filename,
							sourceFilename,
							userPackage,
							userPackageUrl,
							...getOpenApiOptions( filename ),
						}
					);
			return {
				data: formatOutput( schemaObject ),
				...info,
			};
		},
		shortcut: {
			jsc( data, { filename } )
			{
				const jsonSchema = JSON.parse( data );
				const openApiSchemaObject =
					jsonSchemaDocumentToOpenApi(
						jsonSchema,
						getOpenApiOptions( filename )
					);
				return {
					data: formatOutput( openApiSchemaObject ),
					convertedTypes:
						Object.keys( jsonSchema.definitions ?? { } ),
					notConvertedTypes: [ ],
				};
			}
		},
	};
}

const defaultOpenApiOptions: OpenAPIWriterOptions =
	{ format: 'json', title: '', version: '' };

registerReader( getJsonSchemaReader( ) );
registerWriter( getJsonSchemaWriter( ) );
registerReader( getOpenApiReader( ) );
registerWriter( getOpenApiWriter( defaultOpenApiOptions ) );
