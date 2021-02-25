import { promises as fsPromises } from "fs"
import * as globby from "globby"

import {
	getSource,
	relFile,
	writeFile,
	glob,
	ensureAbsolute,
	getRootFolderOfFiles,
	reRootFiles,
} from "./file"

jest.mock( "fs", ( ) => ( {
	promises: {
		readFile: ( filename: string, encoding: string ): Promise< string > =>
			Promise.resolve( `Data in ${filename}` ),
		writeFile:
			jest.fn(
				( filename: string, data: string ) => Promise.resolve( )
			),
	},
} ) );

jest.mock( "globby", ( ) => jest.fn( ( ...args ) => args ) );

describe( "file", ( ) =>
{
	it( "getSource should handle string data", async ( ) =>
	{
		const data = "foo";
		expect( await getSource( { data } ) ).toStrictEqual( { data } );
	} );

	it( "getSource should handle file reading", async ( ) =>
	{
		expect( await getSource( { cwd: "", filename: "/a/b" } ) )
			.toStrictEqual( {
				data: "Data in /a/b",
				filename: "/a/b",
			} );
	} );

	it( "getSource should fail on invalid input", async ( ) =>
	{
		expect( getSource( { } as any ) ).rejects
			.toThrowError( /Invalid source/ );
	} );

	it( "relFile should handle non-from", async ( ) =>
	{
		expect( relFile( undefined, "/a/b" ) ).toBe( "/a/b" );
	} );

	it( "relFile should handle from with absolute to", async ( ) =>
	{
		expect( relFile( "/a/b/c", "/a/b/d" ) ).toBe( "../d" );
	} );

	it( "writeFile should handle from", async ( ) =>
	{
		await writeFile( "/a/c", "the data" );
		expect( fsPromises.writeFile ).toHaveBeenCalledTimes( 1 );
		expect( fsPromises.writeFile )
			.toHaveBeenCalledWith( "/a/c", "the data" );
	} );

	it( "globby mock", ( ) =>
	{
		const globs = [ "a/b", "a/c" ];
		const cwd = "/x";

		glob( globs, cwd, false );
		expect( ( globby as any as jest.Mock ).mock.calls[ 0 ] )
			.toEqual( [ globs, { cwd, dot: true, gitignore: false } ] );

		glob( globs, cwd, true );
		expect( ( globby as any as jest.Mock ).mock.calls[ 1 ] )
			.toEqual( [
				[ ...globs, '!.git' ],
				{ cwd, dot: false, gitignore: true }
			] );
	} );

	it( "ensureAbsolute should handle relative", async ( ) =>
	{
		expect( ensureAbsolute( "a/b", "/x/y" ) ).toEqual( "/x/y/a/b" );
	} );

	it( "ensureAbsolute should handle absolute", async ( ) =>
	{
		expect( ensureAbsolute( "/a/b", "/x/y" ) ).toEqual( "/a/b" );
	} );

	it( "getRootFolderOfFiles should handle different depth", ( ) =>
	{
		const root = getRootFolderOfFiles(
			[ "/a/b/x", "/a/b/d/e" ],
			"/a/b"
		);

		expect( root ).toEqual( "/a/b" );
	} );

	it( "getRootFolderOfFiles should handle absolute & relative paths", ( ) =>
	{
		const root = getRootFolderOfFiles(
			[ "/a/b/c/e", "d/e" ],
			"/a/b"
		);

		expect( root ).toEqual( "/a/b" );
	} );

	it( "getRootFolderOfFiles empty files should return empty string", ( ) =>
	{
		const root = getRootFolderOfFiles( [ ], "/a/b" );

		expect( root ).toEqual( "" );
	} );

	it( "reRootFiles", ( ) =>
	{
		const root = reRootFiles(
			[ "a/b", "a/c", "a/d/e" ],
			"/x1/y1",
			"/x2/y2/new"
		);

		expect( root ).toEqual( {
			files: [
				{
					"in": "/x1/y1/a/b",
					"out": "/x2/y2/new/b",
					"rel": "b",
				},
				{
					"in": "/x1/y1/a/c",
					"out": "/x2/y2/new/c",
					"rel": "c",
				},
				{
					"in": "/x1/y1/a/d/e",
					"out": "/x2/y2/new/d/e",
					"rel": "d/e",
				},
			],
			root: "/x1/y1/a",
			newRoot: "/x2/y2/new",
		} );
	} );
} );
