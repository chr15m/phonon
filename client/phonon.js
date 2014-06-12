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
		connect_function();
	})
	.on('data', receive_function)
	.on('stderr', stderr_function)
	.create();
        
	this.quit = function(propagate) {
		if (pd_socket) {
			pd_socket.write("quit;\n");
		}
		// defaults to true
		if (propagate != false) {
			quit_function();
		}
	}
	
	this.send = function(line) {
		if (line[0] == "!") {
			var args = line.substr(1).split(" ");
			var child = child_process.spawn(args.shift(), args);
			var buffers = {"stdout": "", "stderr": ""};
			
			child.stdout.on('data', function (buffer) {
				receive_function(buffer.toString());
				/*buffers['stdout'] += buffer.toString();
				var lines = buffers['stdout'].split("\n");
				for (var l=0; l<lines-1; l++) {
					receive_function(lines[l]);
				}
				buffers['stdout'] = lines[lines.length] ? lines[lines.length] : "";*/
			});
			// child.stdout.on('end', end);
			child.stderr.on('data', function (buffer) {
				stderr_function(buffer.toString());
				/*buffers['stderr'] += buffer.toString();
				var lines = buffers['stderr'].split("\n");
				for (var l=0; l<lines-1; l++) {
					stderr_function(lines[l]);
				}
				buffers['stderr'] = lines[lines.length] ? lines[lines.length] : "";*/
			});
		} else if (line.split(" ")[0] == "quit") {
			this.quit();
		} else {
			if (pd_socket) {
				pd_socket.write(line + ";\n");
			} else {
				stderr_function("Pd not connected/running.");
			}
		}
	}
}

module.exports = Phonon
