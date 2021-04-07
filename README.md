[![npm version][npm-image]][npm-url]
[![downloads][downloads-image]][npm-url]
[![build status][build-image]][build-url]
[![coverage status][coverage-image]][coverage-url]
[![Language grade: JavaScript][lgtm-image]][lgtm-url]
[![Node.JS version][node-version]][node-url]


<img src="https://raw.githubusercontent.com/grantila/typeconv/master/assets/logo.svg" width="100%" />

**typeconv** is an extremely fast *silver bullet* type conversion utility.

It converts between any of its supported types, bidirectionally.

typeconv lets you convert between type systems which have [`core-types`][core-types-github-url] converters, such as JSON Schema, TypeScript, GraphQL, Open API and [SureType][suretype-github-url]. This package can be used as an API programatically or as an application (installed in `node_modules/.bin` or by using e.g. [`npx`](https://www.npmjs.com/package/npx)).

By taking advantage of the [`core-types`][core-types-github-url] ([npm][core-types-npm-url]) toolbox for generic type handling, typeconv can convert and maintain source code location information, comments, descriptions etc. when converting between the different type systems. It is using the following converter packages:
 * [`core-types-json-schema`][core-types-json-schema-github-url] ([npm][core-types-json-schema-npm-url])
 * [`core-types-ts`][core-types-ts-github-url] ([npm][core-types-ts-npm-url])
 * [`core-types-graphql`][core-types-graphql-github-url] ([npm][core-types-graphql-npm-url])
 * [`core-types-suretype`][core-types-suretype-github-url] ([npm][core-types-suretype-npm-url])

These type systems don't share the same set of types and constraints. For example, JSON Schema has *value* constraints (like *"a string must be longer than 5 characters*") and GraphQL doesn't have `null` or key-value objects as a first-class type. Convertions will therefore produce the smallest common denominator of type information, but still be very useful. See [`core-types`][core-types-github-url] for more information on its supported types, and why not implement a new conversion package yourself!


# TL;DR CLI

Convert files from TypeScript (*"ts"*) to GraphQL (*"gql"*), put the generated files in the `gql-schemas` directory in the same directory structure as the source files:

```zsh
$ typeconv -f ts -t gql -o gql-schemas 'types/**/*.ts'
```

This generates `gql-schemas/*.graphql` for each `.ts` file in `types/` (and sub-directories).

*Note that when using glob patterns, put them in quotes to not have the shell try to expand the pattern - typeconv will do it a lot better!*


## SureType

When converting *from* SureType, typeconv will extract all *exported* validators.


# Contents

 * [Conversion example](#conversion-example)
 * [Usage](#usage)
   * [Command line](#command-line)
   * [As API](#as-api)
     * [JSON Schema](#json-schema)
     * [Open API](#open-api)
     * [TypeScript](#typescript)
     * [GraphQL](#graphql)
     * [SureType](#suretype)


# Conversion example

<details style="padding-left: 32px;border-left: 4px solid gray;">
<summary>Converting the following JSON Schema:</summary>
<p>

```json
{
	"definitions": {
		"User": {
			"type": "object",
			"title": "User type",
			"description": "This type holds the user information, such as name",
			"properties": { "name": { "type": "string", "title": "The real name" } },
			"required": [ "name" ]
		},
		"ChatLine": {
			"type": "object",
			"title": "A chat line",
			"properties": {
				"user": { "$ref": "#/definitions/User" },
				"line": { "type": "string" }
			},
			"required": [ "user", "line" ]
		}
	}
}
```

</p>
</details>

<details style="padding-left: 32px;border-left: 4px solid gray;">
<summary>... to TypeScript will produce:</summary>
<p>

```ts
/*User type

This type holds the user information, such as name*/
export interface User {
	/*The real name*/
	name: string;
}

/*A chat line*/
export interface ChatLine {
	user: User;
	line: string;
}
```

or if converted into TypeScript _declarations_ (for `.d.ts` files), `export interface` will be `export declare interface`.

</p>
</details>

<details style="padding-left: 32px;border-left: 4px solid gray;">
<summary>... and to GraphQL will produce:</summary>
<p>

```graphql
"""
# User type

This type holds the user information, such as name
"""
type User {
	"The real name"
	name: String!
}

"A chat line"
type ChatLine {
	user: User!
	line: String!
}
```

</p>
</details>

Conversions are bi-directional, so any of these type systems can convert to any other.


# Usage


## Command line

You can depend on `typeconv`, and if so, you'll have `node_modules/.bin/typeconv` installed. Or you run it with on-the-fly installation using `npx`, as `npx typeconv args...`.

Use `-f` (or `--from-type`) to specify *from* which type system to convert, and `-t` (or `--to-type`) to specify which type system to convert *to*. Other options can be used to configure each configuration (both the *from* and the *to*) and these options are usually only available for a specific type system.

The types supported are `gql` (GraphQL), `ts` (TypeScript), `jsc` (JSON Schema), `oapi` (Open API) and `st` (SureType).

<details style="padding-left: 32px;border-left: 4px solid gray;">
<summary><code>$ typeconv --help</code></summary>
<p>

```
Usage: typeconv [options] file ...

   Options:

   -h, --help                       Print (this) help screen
   --version                        Print the program version
   -v, --verbose                    Verbose informational output (default: false)
   --dry-run                        Prepare and perform conversion, but write no output (default: false)
   --(no-)hidden                    Include hidden files, i.e. files in .gitignore,
                                    files beginning with '.' and the '.git' directory
                                     (default: true)
   -f, --from-type <type>           Type system to convert from

                                       Values:
                                          ts    TypeScript
                                          jsc   JSON Schema
                                          gql   GraphQL
                                          oapi  Open API
                                          st    SureType
                                          ct    core-types

   -t, --to-type <type>             Type system to convert to

                                       Values:
                                          ts    TypeScript
                                          jsc   JSON Schema
                                          gql   GraphQL
                                          oapi  Open API
                                          st    SureType
                                          ct    core-types

   --(no-)shortcut                  Shortcut conversion if possible (bypassing core-types).
                                    This is possible between SureType, JSON Schema and Open API
                                    to preserve all features which would otherwise be erased.
                                     (default: true)
   -o, --output-directory <dir>     Output directory. Defaults to the same as the input files.
   -O, --output-extension <ext>     Output filename extension to use.
                                    Defaults to 'ts'/'d.ts', 'json', 'yaml' and 'graphql'.
                                    Use '-' to not save a file, but output to stdout instead.
   --(no-)strip-annotations         Removes all annotations (descriptions, comments, ...) (default: false)
   TypeScript
     --(no-)ts-declaration          Output TypeScript declarations (default: false)
     --(no-)ts-disable-lint-header  Output comments for disabling linting (default: true)
     --(no-)ts-descriptive-header   Output the header comment (default: true)
     --(no-)ts-use-unknown          Use 'unknown' type instead of 'any' (default: true)
   GraphQL
     --gql-unsupported <method>     Method to use for unsupported types

                                       Values:
                                          ignore  Ignore (skip) type
                                          warn    Ignore type, but warn
                                          error   Throw an error

     --gql-null-typename <name>     Custom type name to use for null
   Open API
     --oapi-format <fmt>            Output format for Open API (default: yaml)

                                       Values:
                                          json  JSON
                                          yaml  YAML ('yml' is also allowed)

     --oapi-title <title>           Open API title to use in output document.
                                    Defaults to the input filename.
     --oapi-version <version>       Open API document version to use in output document. (default: 1)
   SureType
     --st-ref-method <method>       SureType reference export method (default: provided)

                                       Values:
                                          no-refs   Don't ref anything, inline all types.
                                          provided  Reference types that are explicitly exported
                                          ref-all   Ref all provided types and those with names

     --(no-)st-inline-types         Inline pretty typescript types aside validator code (default: true)
     --(no-)st-export-type          Export the deduced types (or the pretty types,
                                    depending on --st-inline-types)
                                     (default: true)
     --(no-)st-export-schema        Export validator schemas (default: false)
     --(no-)st-export-validator     Export regular validators (default: true)
     --(no-)st-export-ensurer       Export 'ensurer' validators (default: true)
     --(no-)st-export-type-guard    Export type guards (is* validators) (default: true)
     --(no-)st-use-unknown          Use 'unknown' type instead of 'any' (default: true)
     --(no-)st-forward-schema       Forward the JSON Schema, and create an untyped validator schema
                                    with the raw JSON Schema under the hood
                                     (default: false)
```

</p>
</details>


## As API

To convert from one type system to another, you create a *reader* for the type system to convert **from** and a *writer* for the type system to convert **to**. The readers and writers for the different type systems have their own set of options. Some have no options (like the JSON Schema reader), some require options (like the Open API writer).


### makeConverter

Making a converter is done using `makeConverter(reader, writer, options?)`, which takes a reader and a writer, and optionally options:

#### **cwd** (string)

The current working directory, only useful when working with files.

#### **simplify** (boolean) (default true)

When simplify is true, the converter will let core-types
[*compress*](https://github.com/grantila/core-types#simplify) the
types after having converted from {reader} format to core-types.
This is usually recommended, but may cause some annotations (comments)
to be dropped.

#### **map** (ConvertMapFunction)

Custom map function for transforming each type after it has been
converted *from* the source type (and after it has been simplified),
but before it's written to the target type system.

Type: `(node: NamedType, index: number, array: ReadonlyArray<NamedType>) => NamedType`
([NamedType ref](https://github.com/grantila/core-types#specification))

If `filter` is used as well, this runs before `filter`.

If `transform` is used as well, this runs before `transform`.

#### **filter** (ConvertFilterFunction)

Custom filter function for filtering types after they have been
converted *from* the source type.

Type: `(node: NamedType, index: number, array: ReadonlyArray<NamedType>) => boolean`
([NamedType ref](https://github.com/grantila/core-types#specification))

If `map` is used as well, this runs after `map`.

If `transform` is used as well, this runs before `transform`.

#### **transform** (ConvertTransformFunction)

Custom filter function for filtering types after they have been
converted *from* the source type.

Type: `( doc: NodeDocument ) => NodeDocument`
([NodeDocument ref](https://github.com/grantila/core-types#specification))

If `map` is used as well, this runs after `map`.

If `filter` is used as well, this runs after `filter`.

#### **shortcut** (boolean) (default true)

Shortcut reader and writer if possible (bypassing core-types).



### Basic example conversion

```ts
import {
  getTypeScriptReader,
  getOpenApiWriter,
  makeConverter,
} from 'typeconv'

const reader = getTypeScriptReader( );
const writer = getOpenApiWriter( { format: 'yaml', title: 'My API', version: 'v1' } );
const { convert } = makeConverter( reader, writer );
const { data } = await convert( { data: "export type Foo = string | number;" } );
data; // This is the Open API yaml as a string
```


### JSON Schema

There are two exported functions for JSON Schema:

```ts
import { getJsonSchemaReader, getJsonSchemaWriter } from 'typeconv'

const reader = getJsonSchemaReader( );
const writer = getJsonSchemaWriter( );
```

They don't have any options.

typeconv expects the JSON Schema to contain **definitions**, i.e. to be in the form:

<details style="padding-left: 32px;border-left: 4px solid gray;">
<summary>JSON Schema</summary>
<p>

```json
{
	"definitions": {
		"User": {
			"type": "object",
			"properties": { "name": { "type": "string" } },
			"required": [ "name" ]
		},
		"ChatLine": {
			"type": "object",
			"properties": {
				"user": { "$ref": "#/definitions/User" },
				"line": { "type": "string" }
			},
			"required": [ "user", "line" ]
		}
	}
}
```

</p>
</details>

typeconv doesn't support external references (to other files). If you have that, you need to use a reference parser and merge it into one inline-referenced file before using typeconv.


### Open API

Converting to or from Open API can be done with both JSON and YAML. The default is JSON.

When reading, if the filename ends with `.yml` or `.yaml`, typeconv will interpret the input as YAML.

Writing however, is decided in the writer factory and provided to `getOpenApiWriter`.

```ts
import { getOpenApiReader, getOpenApiWriter } from 'typeconv'

const reader = getOpenApiReader( );
const writer = getOpenApiWriter( {
  format: 'yaml',
  title: 'My API',
  version: 'v1',
  schemaVersion: '3.0.0',
} );
```

The options to `getOpenApiWriter` is:

```ts
interface {
  format?: string;
  title: string;
  version: string;
  schemaVersion?: string;
}
```


### TypeScript

TypeScript conversion is done using:

```ts
import { getTypeScriptReader, getTypeScriptWriter } from 'typeconv'

const reader = getTypeScriptReader( );
const writer = getTypeScriptWriter( );
```

Both these take an optional argument.

The `getTypeScriptReader` takes an optional
[`FromTsOptions`](https://github.com/grantila/core-types-ts#typescript-to-core-types)
object from [`core-types-ts`][core-types-ts-github-url], although `warn` isn't necessary since it's set by typeconv internally.

The `getTypeScriptWriter` takes an optional
[`ToTsOptions`](https://github.com/grantila/core-types-ts#core-types-to-typescript)
object from [`core-types-ts`][core-types-ts-github-url], although `warn`, `filename`, `sourceFilename`, `userPackage` and `userPackageUrl` aren't necessary since they're set by typeconv internally.


### GraphQL

GraphQL conversion is done using;

```ts
import { getGraphQLReader, getGraphQLWriter } from 'typeconv'

const reader = getGraphQLReader( );
const writer = getGraphQLWriter( );
```

Both these take an optional argument.

The `getGraphQLReader` takes an optional
[`GraphqlToCoreTypesOptions`](https://github.com/grantila/core-types-graphql#graphql-to-core-types)
object from [`core-types-graphql`][core-types-graphql-github-url], although `warn` isn't necessary since it's set by typeconv internally.

The `getGraphQLWriter` takes an optional
[`CoreTypesToGraphqlOptions`](https://github.com/grantila/core-types-graphql#core-types-to-graphql)
object from [`core-types-graphql`][core-types-graphql-github-url], although `warn`, `filename`, `sourceFilename`, `userPackage` and `userPackageUrl` aren't necessary since they're set by typeconv internally.


### SureType

SureType conversion is done using;

```ts
import { getSureTypeReader, getSureTypeWriter } from 'typeconv'

const reader = getSureTypeReader( );
const writer = getSureTypeWriter( );
```

Both these take an optional argument from the [`core-types-suretype`][core-types-suretype-github-url] package.

The `getSureTypeReader` takes an optional
[`SuretypeToJsonSchemaOptions`](https://github.com/grantila/core-types-suretype#suretype-to-core-types).

The `getSureTypeWriter` takes an optional
[`JsonSchemaToSuretypeOptions`](https://github.com/grantila/core-types-suretype#core-types-to-suretype).


[npm-image]: https://img.shields.io/npm/v/typeconv.svg
[npm-url]: https://npmjs.org/package/typeconv
[downloads-image]: https://img.shields.io/npm/dm/typeconv.svg
[build-image]: https://img.shields.io/github/workflow/status/grantila/typeconv/Master.svg
[build-url]: https://github.com/grantila/typeconv/actions?query=workflow%3AMaster
[coverage-image]: https://coveralls.io/repos/github/grantila/typeconv/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/grantila/typeconv?branch=master
[lgtm-image]: https://img.shields.io/lgtm/grade/javascript/g/grantila/typeconv.svg?logo=lgtm&logoWidth=18
[lgtm-url]: https://lgtm.com/projects/g/grantila/typeconv/context:javascript
[node-version]: https://img.shields.io/node/v/typeconv
[node-url]: https://nodejs.org/en/

[core-types-npm-url]: https://npmjs.org/package/core-types
[core-types-github-url]: https://github.com/grantila/core-types
[core-types-json-schema-npm-url]: https://npmjs.org/package/core-types-json-schema
[core-types-json-schema-github-url]: https://github.com/grantila/core-types-json-schema
[core-types-ts-npm-url]: https://npmjs.org/package/core-types-ts
[core-types-ts-github-url]: https://github.com/grantila/core-types-ts
[core-types-graphql-npm-url]: https://npmjs.org/package/core-types-graphql
[core-types-graphql-github-url]: https://github.com/grantila/core-types-graphql
[core-types-suretype-npm-url]: https://npmjs.org/package/core-types-suretype
[core-types-suretype-github-url]: https://github.com/grantila/core-types-suretype
[suretype-github-url]: https://github.com/grantila/suretype
