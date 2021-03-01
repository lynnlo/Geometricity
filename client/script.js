// Copyright 2021 Lynn O.

// Define Variables
var index
var game

var name_input
var id_input
var error

var players
var chat

var canvas
var room
var information
var points
var drawer
var choices
var clear
var lower
var higher
var size
var pen
var erase

var color_black
var color_white
var color_red
var color_green
var color_blue

var context
var socket

var draw = false;
var local_name;
var local_drawer = false;

// On load
function on_load() {
	// Define Socket
	socket = io();

	// Load Elements
	index = document.getElementById("index");
	game = document.getElementById("game");

	name_input = document.getElementById("name_input");
	id_input = document.getElementById("id_input");
	error = document.getElementById("error");
	canvas = document.getElementById("canvas");
	room = document.getElementById("room")
	information = document.getElementById("information");
	points = document.getElementById("points");
	drawer = document.getElementById("drawer");

	choices = [...document.getElementsByClassName("choices")];

	color_black = document.getElementById("color_black");
	color_white = document.getElementById("color_white");
	color_red = document.getElementById("color_red");
	color_green = document.getElementById("color_green");
	color_blue = document.getElementById("color_blue");

	players = document.getElementById("players");

	clear = document.getElementById("clear");
	lower = document.getElementById("lower");
	higher = document.getElementById("higher");
	size = document.getElementById("size");
	pen = document.getElementById("pen");
	erase = document.getElementById("erase");

	context = canvas.getContext("2d");
	pen_size = 1;
	eraser = false;

	name_input.value = Date.now();

	// Connection
	socket.on("create-success", (id, name) => {
		index.style.display = "none";
		game.style.display = "inherit";
		room.innerHTML = "Room ID : " + id;
		local_name = name;
	})

	socket.on("join-success", (id, name) => {
		index.style.display = "none";
		game.style.display = "inherit";
		room.innerHTML = "Room ID : " + id;
		local_name = name;
	})

	socket.on("connection-failed", () => {
		error.innerHTML = "Game ID or name invalid or taken.";
		error.style.display = "inherit";
	})

	socket.on("all-players", (list) => {
		players.innerHTML = list.join(" ");
		socket.emit("update-canvas", canvas.toDataURL());
	})

	socket.on("new-player", (name) => {
		console.log(name)
	})

	socket.on("remove-player", (name) => {
		console.log(name) 
	})

	socket.on("start-game", (name, list) => {
		drawer.innerHTML = "Drawer : " + name;

		i = 0;
		choices.forEach((x) => {
			x.innerHTML = list[i];
			i += 1;

			x.onclick = () => {
				socket.emit("guess", x.innerHTML);
				console.log("guessed")
				choices.forEach((a) => {a.disabled = true});
				console.log(x.disabled)
			}
		})

		if (name == local_name){
			drawer.innerHTML = "You are the drawer.";
			local_drawer = true;

			clear.disabled = false;
			higher.disabled = false;
			pen.disabled = false;
			erase.disabled = false;

			color_black.disabled = false;
			color_white.disabled = false;
			color_red.disabled = false;
			color_green.disabled = false;
			color_blue.disabled = false;
		}
		else {
			choices.forEach((x) => {
				x.disabled = false;
			})
		}
	})

	socket.on("reset-game", () => {
		drawer.innerHTML = "";

		local_drawer = false;
		
		pen_size = 1;
		eraser = false;
		clear.disabled = true;
		higher.disabled = true;
		pen.disabled = true;
		erase.disabled = true;

		color_black.disabled = true;
		color_white.disabled = true;
		color_red.disabled = true;
		color_green.disabled = true;
		color_blue.disabled = true;

		size.innerHTML = pen_size + (eraser ? "E" : "")

		context.clearRect(0, 0, canvas.width, canvas.height);

		choices.forEach((x) => {
			x.disabled = true;
		})
	})

	socket.on("update-info", (info) => {
		information.innerHTML = info;
	})

	socket.on("update-score", (score) => {
		points.innerHTML = "Points : " + score;
	})

	socket.on("update-canvas", (data) => {
		let image = new Image;
		image.src = data;
		image.width = canvas.width;
		image.height = canvas.height;
		image.onload = function () {
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.drawImage(image, 0, 0);
		}
		delete image;
	})

	// Calibration
	canvas.width = document.body.clientWidth * 0.35;
	canvas.height = canvas.width * (9 / 16);

	unit_size = 1 * (document.body.clientWidth / 500);
	unit = (n = 1) => { return n * unit_size };

	// // Painter
	if (pen_size <= 1) {
		lower.disabled = "true";
	}
	else if (pen_size >= 8) {
		higher.disabled = "true";
	}

	canvas.addEventListener("mousedown", (e) => {
		if (local_drawer){
			draw = true;
			context.strokeStyle = (eraser ? "#353535" : context.stroke);
			context.beginPath();
		}
		
	});

	canvas.addEventListener("mouseup", (e) => {
		if (local_drawer){
			draw = false;
			context.closePath();
		}
	});

	canvas.addEventListener("mousemove", (e) => {
		if (local_drawer && draw) {
			context.lineTo(e.layerX, e.layerY);
			context.lineWidth = unit(pen_size + (eraser ? 3 : 0));
			context.stroke();

			// Send image
			socket.emit("update-canvas", canvas.toDataURL());
		}
		else {
			context.moveTo(e.layerX, e.layerY);
		}
	})

	clear.onclick = () => {
		context.clearRect(0, 0, canvas.width, canvas.height);

		// Send image
		socket.emit("update-canvas", canvas.toDataURL());
	}

	lower.onclick = () => {
		pen_size -= 1;
		if (pen_size <= 1) {
			lower.disabled = "true";
		}
		if (pen_size < 8) {
			higher.disabled = "";
		}
		size.innerHTML = pen_size + (eraser ? "E" : "")
	}

	higher.onclick = () => {
		pen_size += 1;
		if (pen_size >= 8) {
			higher.disabled = "true";
		}
		if (pen_size > 1) {
			lower.disabled = "";
		}
		size.innerHTML = pen_size + (eraser ? "E" : "")
	}

	pen.onclick = () => {
		eraser = false;
		size.innerHTML = pen_size;
	}

	erase.onclick = () => {
		eraser = true;
		size.innerHTML = pen_size + "E";
	}

	color_black.onclick = () => {
		context.strokeStyle = "#050505";
	}

	color_white.onclick = () => {
		context.strokeStyle = "#aaaaaa";
	}

	color_red.onclick = () => {
		context.strokeStyle = "#aa0505";
	}

	color_green.onclick = () => {
		context.strokeStyle = "#05aa05";
	}

	color_blue.onclick = () => {
		context.strokeStyle = "#0505aa";
	}

}

function create_game() {
	if (name_input.value && name_input.value.length >= 3) {
		if (id_input.value && id_input.value.length == 4) {
			socket.emit("create-request", name_input.value, id_input.value);
		}
		else {
			error.innerHTML = "Please enter a valid game ID!";
			error.style.display = "inherit";
		}
	}
	else {
		error.innerHTML = "Please enter a valid name of 3 or more characters!";
		error.style.display = "inherit";
	}
}

function join_game() {
	if (name_input.value && name_input.value.length >= 3) {
		if (id_input.value && id_input.value.length == 4) {
			socket.emit("join-request", name_input.value, id_input.value);
		}
		else {
			error.innerHTML = "Please enter a valid game ID!";
			error.style.display = "inherit";
		}
	}
	else {
		error.innerHTML = "Please enter a valid name of 3 or more characters!";
		error.style.display = "inherit";
	}
}

function clear_error() {
	error.style.display = "none";
}