import { FormatGraph, makePathKey } from "./format-graph.js"
import { Reader } from "./reader.js"
import { Writer } from "./writer.js"
import { TypeImplementation } from "./types.js"


function fakeReader(
	kind: TypeImplementation,
	formats: Array< TypeImplementation > = [ ],
	managedRead = false
)
: Reader
{
	return {
		kind,
		read: null as any,
		managedRead,
		shortcut: Object.fromEntries(
			formats.map( format => [ format, null ] )
		),
	};
}

function fakeWriter(
	kind: TypeImplementation,
	formats: Array< TypeImplementation > = [ ]
)
: Writer
{
	return {
		kind,
		write: null as any,
		shortcut: Object.fromEntries(
			formats.map( format => [ format, null ] )
		),
	};
}

describe( "format-graph", ( ) =>
{
	const gqlRead = fakeReader( 'gql', [ 'jsc' ] );
	const jscRead = fakeReader( 'jsc', [ 'jsc', 'oapi' ] );
	const oapiRead = fakeReader( 'oapi', [ 'jsc', 'oapi' ] );
	const tsRead = fakeReader( 'ts' );
	const stRead = fakeReader( 'st', [ 'jsc' ], true );

	const gqlWrite = fakeWriter( 'gql' );
	const tsWrite = fakeWriter( 'ts' );
	const jscWrite = fakeWriter( 'jsc', [ 'jsc' ] );
	const oapiWrite = fakeWriter( 'oapi', [ 'jsc' ] );
	const stWrite = fakeWriter( 'st', [ 'jsc' ] );

	const makeGraph = ( ) =>
	{
		const graph = new FormatGraph( );

		graph.registerReader( gqlRead );
		graph.registerReader( jscRead );
		graph.registerReader( oapiRead );
		graph.registerReader( tsRead );
		graph.registerReader( stRead );

		graph.registerWriter( gqlWrite );
		graph.registerWriter( tsWrite );
		graph.registerWriter( jscWrite );
		graph.registerWriter( oapiWrite );
		graph.registerWriter( stWrite );

		return graph;
	};

	it( "findAllPaths (incl core-types)", ( ) =>
	{
		const graph = makeGraph( );

		const paths = graph.findAllPaths(
			tsRead,
			gqlWrite,
			undefined
		);

		expect( paths.map( path => makePathKey( path ) ) ).toMatchSnapshot( );
	} );

	it( "findAllPaths (only shortcuts when none exist)", ( ) =>
	{
		const graph = makeGraph( );

		const paths = graph.findAllPaths(
			tsRead,
			gqlWrite,
			true
		);

		expect( paths.map( path => makePathKey( path ) ) ).toMatchSnapshot( );
} );

	it( "findAllPaths (only shortcuts when exist)", ( ) =>
	{
		const graph = makeGraph( );

		const paths = graph.findAllPaths(
			stRead,
			oapiWrite,
			true
		);

		expect( paths.map( path => makePathKey( path ) ) ).toMatchSnapshot( );
	} );

	it( "findAllPaths (no shortcuts)", ( ) =>
	{
		const graph = makeGraph( );

		const paths = graph.findAllPaths(
			stRead,
			oapiWrite,
			false
		);

		expect( paths.map( path => makePathKey( path ) ) ).toMatchSnapshot( );
	} );
} );
