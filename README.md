# Comfort

> A much better node.js commander solution for sub commands.

If you have sub commands, such as '\<my-module\> \<command\>', comfort will be extremely helpful.
 
Comfort is designed to **make your code better organized and of scalability**, unlike [commander.js](https://github.com/visionmedia/commander.js).

## Installation

```bash
npm install comfort --save
npm install comfort -g
```

## Getting Started

For most situations, you could use `init` command of comfort, and skip all my verbose explanations:

```bash
npm install comfort -g # install comfort cli
cd path/to/your/repo
npm init # run `npm init` first
comfort init [--force]
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


****

# Methods

## comfort.parser

### parser.parse(argv, rules)
Parse an argument vector to an object according to the rules, the parsed object will be filtered and santitized.

##### Returns
`Object` the parsed object

##### argv
`Array` `process.argv` or `process.argv`-like array.

##### rules
`Object` rules. See "option parsing" section.


### parser.clean(data, rules[, type_defs])

Clean the specified data. Notice that the original data will be changed.

It will be extremely usefull to prevent XSS attack.

##### data
`Object`

##### Returns
`data`








