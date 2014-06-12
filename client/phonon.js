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
			var child = child_process.exec(line.substr(1), function (error, stdout, stderr) {
				stderr_function(stderr);
				receive_function(stdout);
				//if (error) {
				//	stderr_function(error);
				//	console.log(error);
				//}
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
