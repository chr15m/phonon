var port = require('port');
var child_process = require('child_process');

function Phonon(receive_function, stderr_function, connect_function, quit_function) {
	var pd_socket = null;
	
	port({
	    'read': 8205,
	    'write': 8206,
	    // 'basepath': __dirname,
	    'flags': {
		'nogui': false,
		'stderr': true,
		'path': __dirname,
		'open': 'patches/phonon_main.pd'
	    }
	})
	.on('connect', function(socket) {
		pd_socket = socket;
		pd_socket.on('close', function(had_error) {
			quit_function();
		});
		connect_function();
	})
	.on('data', receive_function)
	.on('stderr', stderr_function)
	.create();
        
	this.quit = function(propagate) {
		if (pd_socket && pd_socket.writable) {
			pd_socket.write("quit;\n");
		}
		// defaults to true
		if (propagate != false) {
			quit_function();
		}
	}
	
	this.send = function(line) {
		var args = line.split(" ");
		if (line[0] == "!") {
			var args = line.substr(1).split(" ");
			var child = child_process.exec(line.substr(1), function (error, stdout, stderr) {
				stderr_function(stderr);
				receive_function(stdout);
				//if (error) {
				//	stderr_function(error);
				//	console.log(error);
				//}
			});
		} else if (args[0] in commands) {
			var cmd_name = args.shift();
			var cmd = commands[cmd_name];
			if (cmd.fn) {
				if (!cmd["params"] || (cmd.params.length == args.length)) {
					cmd.fn.apply(this, args);
				} else {
					stderr_function("Incorrect number of arguments - should be " + cmd.params.length + ".");
				}
			} else {
				stderr_function("No function exists for command " + cmd_name);
			}
		} else {
			if (pd_socket && pd_socket.writable) {
				pd_socket.write(line + ";\n");
			} else {
				stderr_function("Pd not connected/running.");
			}
		}
	}
	
	var commands = {
		"help": {
			"help": "Invoke this help.",
			"fn": function() {
				for (var c in commands) {
					receive_function(c + " - " + commands[c].help);
					if (commands[c]["params"]) {
						for (var p=0; p<commands[c].params.length; p++) {
							for (var pr in commands[c].params[p]) {
								receive_function("\t" + pr + ": " + commands[c].params[p][pr]);
							}
						}
					}
					receive_function("\n");
				}
			}
		},
		"open": {
			"help": "Ask Pd to open a patch.",
			"params": [
				{"path": "Path to patch e.g. 'test.pd' or '/home/user/mypatch.pd'."}
			],
			"fn": function(path) {
				var components = path.split("/");
				pd_socket.write("open " + components.pop() + " " + components.join("/") + ";\n");
			}
		},
		"quit": {
			"help": "Close everything and exit.",
			"fn": function() {
				this.quit();
			}
		}
	}
}

module.exports = Phonon
