import type { NodeDocument } from "core-types"

import type { Reader } from "./reader"
import type { Writer } from "./writer"
import { stringify } from "./utils"
import { registerReader, registerWriter } from "./format-graph"


export function getCoreTypesReader( ): Reader
{
	return {
		kind: 'ct',
		read( source )
		{
			const doc = JSON.parse( source ) as NodeDocument;
			return {
				data: doc,
				convertedTypes: doc.types.map( ( { name } ) => name ),
				notConvertedTypes: [ ],
			};
		},
	};
}

export function getCoreTypesWriter( ): Writer
{
	return {
		kind: 'ct',
		write( doc )
		{
			return {
				data: stringify( doc ),
				convertedTypes: doc.types.map( ( { name } ) => name ),
				notConvertedTypes: [ ],
			};
		},
	};
}

registerReader( getCoreTypesReader( ) );
registerWriter( getCoreTypesWriter( ) );
