import { promises as fsPromises } from "fs"
import path from "path"

import { execa } from "execa"
import { temporaryDirectory } from "tempy"

describe( "cli", ( ) =>
{
	it( "should convert typescript to graphql", async ( ) =>
	{
		const dir = temporaryDirectory( );
		await execa(
			"node",
			[
				"dist/bin/typeconv.js",
				"--verbose",
				"-f",
				"ts",
				"-t",
				"gql",
				"-o",
				dir,
				"fixtures/**"
			]
		);

		const result1 =
			await fsPromises.readFile(
				path.join( dir, "types1.graphql" ),
				"utf-8"
			);

		const result2 =
			await fsPromises.readFile(
				path.join( dir, "sub/types2.graphql" ),
				"utf-8"
			);

		expect( result1 ).toMatchSnapshot( );
		expect( result2 ).toMatchSnapshot( );
	} );
} );
