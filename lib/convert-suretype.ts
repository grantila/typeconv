import {
	convertCoreTypesToSureType,
	convertJsonSchemaToSureType,
	convertSureTypeToCoreTypes,
	convertSuretypeToJsonSchema,
	JsonSchemaToSuretypeOptions,
	SuretypeToJsonSchemaOptions,
} from 'core-types-suretype'

import { Reader } from "./reader"
import { Writer } from "./writer"
import { userPackage, userPackageUrl } from "./package"
import { registerReader, registerWriter } from './format-graph';
import { stringify } from "./utils"


export function getSureTypeReader( options?: SuretypeToJsonSchemaOptions )
: Reader
{
	return {
		kind: 'st',
		managedRead: true,
		read( filename, { warn } )
		{
			return convertSureTypeToCoreTypes(
				filename,
				{
					warn,
					userPackage,
					userPackageUrl,
					...options,
				}
			);
		},
		shortcut: {
			async jsc( filename, { warn } )
			{
				const result = await convertSuretypeToJsonSchema(
					filename,
					{
						warn,
						userPackage,
						userPackageUrl,
						...options,
					}
				);
				const { convertedTypes, notConvertedTypes, data } = result;
				return {
					convertedTypes, notConvertedTypes, data: stringify( data ),
				};
			},
		},
	};
}

export function getSureTypeWriter( options?: JsonSchemaToSuretypeOptions )
: Writer
{
	return {
		kind: 'st',
		write( doc, { warn, filename, sourceFilename } )
		{
			return convertCoreTypesToSureType(
				doc,
				{
					warn,
					filename,
					sourceFilename,
					userPackage,
					userPackageUrl,
					...options,
				}
			);
		},
		shortcut: {
			jsc( dataString, { warn, filename, sourceFilename } )
			{
				return convertJsonSchemaToSureType(
					dataString,
					{
						warn,
						filename,
						sourceFilename,
						userPackage,
						userPackageUrl,
						...options
					}
				);
			},
		},
	};
}

registerReader( getSureTypeReader( ) );
registerWriter( getSureTypeWriter( ) );
