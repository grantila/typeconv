import { TypeImplementation } from "./types"
import { Reader } from "./reader"
import { Writer } from "./writer"


type TI = TypeImplementation;

interface GraphPathSegment
{
	format: TI;
	reader: Reader;
	writer: Writer;
}

type PathKey = string;
type GraphPath = Array< GraphPathSegment >;

export function makePathKey( path: GraphPath ): PathKey
{
	return path
		.map( ( { format, reader, writer } ) =>
			`${reader.kind}->{${format}}->${writer.kind}`
		)
		.join( '  ' );
}

export class FormatGraph
{
	// Maps from-type -> (type-type -> reader)
	private readerGraph = new Map< TI, Map< TI, Reader > >( );
	// Maps from-type -> (type-type -> writer)
	private writerGraph = new Map< TI, Map< TI, Writer > >( );

	constructor( ) { }

	registerReader( reader: Reader )
	{
		const toMap: Array< [ TI, Reader ] > = [
			[ 'ct', reader ],
			...Object
				.keys( reader.shortcut ?? { } )
				.map( ( key ): [ TI, Reader ] => [ key as TI, reader ] ),
		];
		this.readerGraph.set( reader.kind, new Map( toMap ) );
	}

	registerWriter( writer: Writer )
	{
		const makeTo = ( ): [ TI, Writer ] => [ writer.kind, writer ];

		const insertWriter = ( from: TI ) =>
		{
			const old = [ ...this.writerGraph.get( from ) ?? [ ] ];
			this.writerGraph.set( from, new Map( [ ...old, makeTo( ) ] ) );
		};

		insertWriter( 'ct' );
		Object
			.keys( writer.shortcut ?? { } )
			.forEach( key => insertWriter( key as TI ) );
	}

	findAllPaths(
		reader: Reader,
		writer: Writer,
		shortcuts: boolean | undefined
	)
	: Array< GraphPath >
	{
		const paths = new Map< PathKey, GraphPath >( );

		interface Opts
		{
			allowManaged?: boolean;
			cache: Set< Reader >;
		}

		const appendSet = < T >( set: Set< T >, val: T ) =>
			new Set( [ ...set, val ] );

		const recurse = ( reader: Reader, path: GraphPath, opts: Opts ) =>
		{
			const { allowManaged = false, cache } = opts;

			const handleFound = ( writer: Writer, format: TI ) =>
			{
				if ( reader.managedRead && !allowManaged )
					return;
				const newPath = [ ...path, { reader, writer, format } ];
				const pathKey = makePathKey( newPath );
				paths.set( pathKey, newPath );
			};

			const formats = [
				...shortcuts ? [ ] : [ 'ct' ],
				...shortcuts !== false
					? Object.keys( reader.shortcut ?? { } )
					: [ ]
			];
			for ( const format of formats as Array< TI > )
			{
				const writers = this.writerGraph.get( format );
				for ( const [ to, _writer ] of writers?.entries( ) ?? [ ] )
				{
					if ( writer.kind === _writer.kind )
						handleFound( writer, format );
					else if ( reader.kind === _writer.kind )
						continue;
					else
					{
						// Find readers and recurse
						const readers = this.readerGraph.get( to );
						for ( const _reader of readers?.values( ) ?? [ ] )
						{
							if ( _reader.managedRead && !allowManaged )
								continue;
							else if ( cache.has( _reader ) )
								continue; // Cyclic
							recurse(
								_reader,
								[ ...path, { reader, writer: _writer, format } ],
								{
									cache: appendSet( cache, _reader ),
								}
							);
						}
					}
				}
			}
		};

		recurse( reader, [ ], { allowManaged: true, cache: new Set( ) } );

		return [ ...paths.values( ) ].sort( ( a, b ) => a.length - b.length );
	}

	findBestPath(
		reader: Reader,
		writer: Writer,
		shortcut: boolean | undefined
	)
	{
		const paths = this.findAllPaths( reader, writer, shortcut );
		if ( paths.length > 0 )
			return paths[ 0 ];

		// Allow all, find shortest path
		return this.findAllPaths( reader, writer, undefined )[ 0 ];
	}

	clone( )
	{
		const clone =  new FormatGraph( );

		const readers = [ ...this.readerGraph.values( ) ]
			.flatMap( map => [ ...map.values( ) ] );
		const writers = [ ...this.writerGraph.values( ) ]
			.flatMap( map => [ ...map.values( ) ] );

		readers.forEach( reader => clone.registerReader( reader ) );
		writers.forEach( writer => clone.registerWriter( writer ) );

		return clone;
	}
}

const defaultGraph = new FormatGraph( );

export function registerReader( reader: Reader )
{
	defaultGraph.registerReader( reader );
}
export function registerWriter( writer: Writer )
{
	defaultGraph.registerWriter( writer );
}

export interface ConversionOptions
{
	shortcut?: boolean;
}

export class ConversionContext
{
	private shortcut: boolean | undefined;
	private graph: FormatGraph;

	constructor(
		private reader: Reader,
		private writer: Writer,
		opts: ConversionOptions = { }
	)
	{
		this.shortcut = opts.shortcut;
		this.graph = defaultGraph.clone( );
		this.graph.registerReader( reader );
		this.graph.registerWriter( writer );
	}

	getPath( )
	{
		return this.graph.findBestPath(
			this.reader,
			this.writer,
			this.shortcut
		);
	}

}
