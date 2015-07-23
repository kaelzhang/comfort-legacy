[![NPM version](https://badge.fury.io/js/comfort.png)](http://badge.fury.io/js/comfort)
[![Build Status](https://travis-ci.org/kaelzhang/node-comfort.png?branch=master)](https://travis-ci.org/kaelzhang/node-comfort)
[![Dependency Status](https://gemnasium.com/kaelzhang/node-comfort.png)](https://gemnasium.com/kaelzhang/node-comfort)

# comfort

Comfort is a much better node.js commander solution for sub commands.

If you have sub commands, such as `<my-module> <command>`, comfort will be extremely helpful.
 
Comfort is designed to **make your code better organized and of scalability**, unlike [commander.js](https://github.com/visionmedia/commander.js).

If you want to create a complicated command tool with heavy arguments overloading, `comfort` will be your very choice.

## Features

#### Plugin support

A command-line application (`cortex` for example) and its sub-commands built with `comfort` are structured much like git(1).

To develop a new sub-command(`'blah'` for example) as a plugin(so you don't want to change the origin repository of `cortex`), just create a new node.js module, add a value to `bin` field of the package.json as:

```
{
	"bin": {
		"cortex-blah": "bin/xxxxx.js"
	}
}
```
Comfort will look for `PATH` in your env, and search for a plugin command.

#### Falling love with creating sub-commands

To add a new built-in command(`'haha'` for example), just add a file "haha.js" to the `options.command_root` directory, DONE!

#### Powerful argument parser


# Installation

```bash
npm install comfort --save
```

# Getting Started

For most situations, you could use `init` command of comfort, and skip all my verbose explanations:

```bash
npm install comfort -g # install comfort cli
cd path/to/your/repo
npm init # run `npm init` first
comfort init
npm link # maybe you should use "sudo"
# Done! and you could see your command immediatly
<your-bin>
```

By default, there will be a built-in `'help'` command to display help informations and a `'sample'` command for instance. 

You could run

```bash
<your-bin> sample # to see the result
<your-bin> help sample # to the help info for `sample`
```
	
**All things would be done after a few questions were asked~~**.

****
	
If you want to figure out how comfort works, well, 
	
> Shut up, just show me the code!

and just see the annotations in the files under `root` directory.

Or, you could execute `comfort init` command, and see what happened to your new project.

