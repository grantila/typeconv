
export type MockedLoggers< F extends 'log' | 'warn' | 'error' > =
	{
		[ K in F ]: jest.Mock;
	}

export function withConsoleMock< R, F extends 'log' | 'warn' | 'error' >(
	fn: ( mocks: MockedLoggers< F > ) => R,
	logFn: Array< F >
)
{
	return async ( ) =>
	{
		const mockFns = logFn
			.map( fn =>
			{
				const orig = console[ fn ];
				const mock = jest.fn( );
				console[ fn ] = mock;
				return { fn, orig, mock };
			} );

		const mocks = Object.fromEntries(
			mockFns.map( ( { fn, mock } ) => [ fn, mock ] )
		) as MockedLoggers< F >;

		await fn( mocks );

		mockFns.forEach( ( { fn, orig } ) =>
		{
			console[ fn ] = orig;
		} );
	}
}

export function withConsoleError< R >(
	fn: ( mocks: MockedLoggers< 'error' > ) => R
)
{
	return withConsoleMock( fn, [ 'error' ] );
}

export function withConsoleWarn< R >(
	fn: ( mocks: MockedLoggers< 'warn' > ) => R
)
{
	return withConsoleMock( fn, [ 'warn' ] );
}

export function withConsoleLog< R >(
	fn: ( mocks: MockedLoggers< 'log' > ) => R
)
{
	return withConsoleMock( fn, [ 'log' ] );
}
