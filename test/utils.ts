
export function withConsoleMock< R >(
	fn: ( mock: jest.Mock ) => R,
	logFn: 'log' | 'warn' | 'error'
)
{
	return async ( ) =>
	{
		const orig = console[ logFn ];
		const mock = jest.fn( );
		console[ logFn ] = mock;

		await fn( mock );

		console[ logFn ] = orig;
	}
}

export function withConsoleWarn< R >( fn: ( mock: jest.Mock ) => R )
{
	return withConsoleMock( fn, 'warn' );
}

export function withConsoleLog< R >( fn: ( mock: jest.Mock ) => R )
{
	return withConsoleMock( fn, 'log' );
}
