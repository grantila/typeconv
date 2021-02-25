import {
	convertCoreTypesToGraphql,
	convertGraphqlToCoreTypes,
	CoreTypesToGraphqlOptions,
	GraphqlToCoreTypesOptions,
} from 'core-types-graphql'

import { Reader } from "./reader"
import { Writer } from "./writer"
import { userPackage, userPackageUrl } from "./package"


export function getGraphQLReader( graphqlOptions?: GraphqlToCoreTypesOptions )
: Reader
{
	return {
		kind: 'gql',
		read( source, options )
		{
			return convertGraphqlToCoreTypes(
				source,
				{
					...options,
					...graphqlOptions,
				}
			);
		}
	};
}

export function getGraphQLWriter( graphqlOptions?: CoreTypesToGraphqlOptions )
: Writer
{
	return {
		kind: 'gql',
		write( doc, options )
		{
			return convertCoreTypesToGraphql(
				doc,
				{
					warn: options.warn,
					filename: options.filename,
					sourceFilename: options.sourceFilename,
					userPackage,
					userPackageUrl,
					...graphqlOptions,
				}
			);
		}
	};
}
