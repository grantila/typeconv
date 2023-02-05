import {
	convertCoreTypesToTypeScript,
	convertTypeScriptToCoreTypes,
	FromTsOptions,
	ToTsOptions,
} from "core-types-ts"

import { Reader } from "./reader.js"
import { Writer } from "./writer.js"
import { userPackage, userPackageUrl } from "./package.js"
import { registerReader, registerWriter } from "./format-graph.js"


export function getTypeScriptReader( tsOptions?: FromTsOptions ): Reader
{
	return {
		kind: 'ts',
		read( source, { warn, filename } )
		{
			return convertTypeScriptToCoreTypes(
				source,
				{
					warn,
					...tsOptions,
				}
			);
		}
	};
}

export function getTypeScriptWriter( tsOptions?: ToTsOptions ): Writer
{
	return {
		kind: 'ts',
		write( doc, { warn, filename, sourceFilename } )
		{
			return convertCoreTypesToTypeScript(
				doc,
				{
					warn,
					filename,
					sourceFilename,
					userPackage,
					userPackageUrl,
					...tsOptions,
				}
			);
		}
	};
}

registerReader( getTypeScriptReader( ) );
registerWriter( getTypeScriptWriter( ) );
