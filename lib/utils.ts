
export function stringify( value: any )
{
	return JSON.stringify( value, null, 2 );
}

export function ensureType< T >(
	data: T | string,
	typeName: string,
	valids: Array< T >,
	orElse: ( ) => never
)
// @ts-ignore
: data is T
{
	if ( valids.includes( data as T ) )
		return true;

	if ( data )
		console.error( `Invalid ${typeName}: ${data}\n` );

	orElse( );
}
