import { promises as fsPromises } from "fs"
import * as path from "path"

import * as execa from "execa"
import * as tempy from "tempy"

describe( "cli", ( ) =>
{
	it( "should convert typescript to graphql", async ( ) =>
	{
		const dir = tempy.directory( );
		await execa(
			"node",
			[
				"node_modules/.bin/ts-node",
				"lib/bin/typeconv.ts",
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
