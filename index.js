#!/usr/bin/env node
var fs = require('fs');
var parser = require('xml2json');

var file = process.argv[2];
var xml = fs.readFileSync(file || 'build.xml').toString();

var build = parser.toJson(xml, {object: true}); //returns a string containing the JSON structure by default

function TargetBuilder(name) {
	this.name = name;
	this.dependencies = [];
	this.commands = [];
}

TargetBuilder.prototype.indentation = '\t';

TargetBuilder.prototype.depend = function (dependency) {
	this.dependencies.push(dependency);
	return this;
};

TargetBuilder.prototype.exec = function (exec) {
	this.commands.push(exec);
	return this;
};

TargetBuilder.prototype.toString = function () {
	var str = this.name + ': ' + this.formatDependencies();
	str += '\n';
	
	this.commands.forEach(function (command) {
		str += this.formatCommand(command) + '\n';
	}.bind(this));

	return str;
};

TargetBuilder.prototype.formatDependencies = function () {
	return this.dependencies.join(' ');
};

TargetBuilder.prototype.formatCommand = function (command) {
	console.log(command)
	var args = command.arg
	if (!Array.isArray(args)) {
		args = [command.arg]
	}
	var valueargs = args.filter(function (arg) {
		return 'value' in arg;
	}).map(function (arg) {
		return arg.value;
	})
	
	var lineargs = args.filter(function (arg) {
		return 'line' in arg;
	}).map(function (arg) {
		return arg.line
	})

	var formattedCommand = command.command + ' ' + valueargs.join(' ') + lineargs.join(' ');
	if (command.outputproperty) {
		formattedCommand = command.outputproperty + '=' + '`' + formattedCommand +  '`'
	}

	return this.indentation + formattedCommand
};

function makeTarget(antTarget) {
	var target = new TargetBuilder(antTarget.name);
	visitExec(target, antTarget);
	visitDepend(target, antTarget);

	return target.toString();
}

function arr(itemOrArray) {
	return Array.isArray(itemOrArray) ? itemOrArray :
		(!itemOrArray) ? [] : [itemOrArray];
}

function visitDepend(builder, target) {
	if (target.depends) {
		target.depends.split(',')
			.forEach(builder.depend.bind(builder));
	}
}

function visitExec(builder, target) {
	if (target.exec) {
		var execs = Array.isArray(target.exec) ? target.exec : [target.exec];
		execs.forEach(function (exec) {
			builder.exec(exec);
		});
	}
}

var targets = build.project.target
	.map(makeTarget);

targets.unshift(new TargetBuilder('all').depend('build'));

var makefile = targets.map(function (t) {
		return t.toString();
	})
	.join('\n\n');



fs.writeFileSync('Makefile', makefile);