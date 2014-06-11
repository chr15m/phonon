var port = require('port');
var child = require('child_process');

function Phonon(receive_function, connect_function, stderr_function) {
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
        
	this.exit = function() {
		if (pd_socket) {
			pd_socket.write("exit;\n");
		}	 
	}
	
	this.send = function(line) {
		if (pd_socket) {
			pd_socket.write(line + ";\n");
		} else {
			stderr_function("Pd not connected/running.");
		}
	}
}

module.exports = Phonon
