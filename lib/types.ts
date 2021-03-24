
export interface Options
{
	declaration?: boolean;
	userPackage?: string;
	userPackageUrl?: string;
	noDisableLintHeader?: boolean;
	noDescriptiveHeader?: boolean;
}

export type SyncOrAsync< T > = T | PromiseLike< T >;

export type TypeImplementation =
	// TypeScript
	| 'ts'
	// JSON Schema
	| 'jsc'
	// GraphQL
	| 'gql'
	// Open API
	| 'oapi'
	// SureType
	| 'st'
	// core-types
	| 'ct';
