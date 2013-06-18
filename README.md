# Sub-commander

> A much better node.js commander solution for sub commands.

If you have sub commands, such as '\<my-module\> \<command\>', sub-commander will be extremely helpful.
 
Sub-commander is designed to **make your code better organized and of scalability**, unlike [commander.js](https://github.com/visionmedia/commander.js).

## Installation
	npm install sub-commander --save

## Getting Started

For most situation, you could use `init` command of sub-commander, and skip all my verbose explanations:
	
	cd path/to/your/repo
	# you should do this after `npm init`
	sub-commander init
	npm link # may be you should use "sudo"
	
And all things would be done after a few questions were asked.

****

And also, there's an avaliable sub-commander [grunt-init](https://github.com/gruntjs/grunt-init) template. :
	
	mkdir -p ~/grunt-init/
	git clone git@github.com:kaelzhang/grunt-init-sub-commander.git ~/grunt-init/sub-commander
	cd path/to/your/repo
	grunt-init sub-commander
	<your-command>
	
But, if you want to figure out how sub-commander works ——

	var commander = require('sub-commander');
	var path = require('path');
	
	commander({
		commands: path.join(__dirname, '..', 'lib', 'command'),
		options: path.join(__dirname, '..', 'lib', 'option'),
		name: 'cortex'
	}).cli();

The code above is all you need in your bin file( `bin/cli.js` ), if suppose the directory structure of your project is:

	bin/
		cli.js
		
	lib/
		command/
			install.js
			
		option/
			install.js
			
BTW, all sections here will take `'cortex install'` for example.
			

## Option Parsing

(what's comming...)

See sample project under `'test/'` for now.


## Commander
			
(what's comming...)

See sample project under `'test/'` for now.







