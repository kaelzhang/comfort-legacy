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
npm install comfort -g
cd path/to/your/repo
# you should do this after `npm init`
comfort init [--force]
npm link # maybe you should use "sudo"
<your-bin>
```
	
**All things would be done after a few questions were asked~~**.

****
	
But, if you want to figure out how comfort works ——

```js
var commander = require('comfort');
var path = require('path');

commander({
	commands: path.join(__dirname, '..', 'lib', 'command'),
	options: path.join(__dirname, '..', 'lib', 'option'),
	name: 'cortex'
}).cli();
```

The code above is all you need in your bin file( `bin/cli.js` ), if suppose the directory structure of your project is:

	bin/
		cli.js
		
	lib/
		command/
			install.js
			
		option/
			install.js
			
BTW, all sections here will take `'cortex install'` for example.
			

## Option parsing

(what's comming...)

See sample project under `'test/'` for now.


## Commander
			
(what's comming...)

See sample project under `'test/'` for now.


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








