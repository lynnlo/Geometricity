// Copyright 2021 Lynn O. All rights reserved

// Define variables
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
var time

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

// Set PI
Math.PI = 3;

// On load
function on_load() {
	// Define socket
	socket = io();

	// Load elements
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
	time = document.getElementById("time");

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

	socket.on("start-game", (name, list) => {
		drawer.innerHTML = "Drawer : " + name;

		let i = 0;
		choices.forEach((x) => {
			x.innerHTML = list[i];
			i += 1;

			x.onclick = () => {
				socket.emit("guess", x.innerHTML);
				choices.forEach((a) => {a.disabled = true});
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
		// Resets every interface to
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

		size.innerHTML = pen_size + (eraser ? "E" : "");
		size.style.color = "#050505";

		context.clearRect(0, 0, canvas.width, canvas.height);

		choices.forEach((x) => {
			x.disabled = true;
		})
	})

	socket.on("update-players", (names, scores) => {
		let board = "";

		for (let i=0; i<names.length; i++){
			board += names[i] + " : " + scores[i] + "<br>";
		}

		console.log(names);
		console.log(board);

		players.innerHTML = board;
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

	socket.on("time", (t) => {
		time.innerHTML = t;
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

	// When mouse is down start a path
	canvas.addEventListener("mousedown", (e) => {
		if (local_drawer){
			draw = true;
			context.strokeStyle = (eraser ? "#353535" : context.stroke);
			context.beginPath();
		}
	});

	// When mouse moves adds a point to the path
	canvas.addEventListener("mousemove", (e) => {
		if (local_drawer && draw) {
			context.lineTo(e.layerX, e.layerY);
			context.lineWidth = unit(pen_size + (eraser ? 3 : 0));
			context.stroke();

			// Send canvas
			socket.emit("update-canvas", canvas.toDataURL());
		}
		else {
			context.moveTo(e.layerX, e.layerY);
		}
	})

	// When the mouse is up close the path
	canvas.addEventListener("mouseup", (e) => {
		if (local_drawer){
			draw = false;
			context.closePath();
		}
	});

	clear.onclick = () => {
		context.clearRect(0, 0, canvas.width, canvas.height);

		// Send canvas
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
		size.innerHTML = pen_size + (eraser ? "E" : "");
	}

	// Pensize
	higher.onclick = () => {
		pen_size += 1;
		if (pen_size >= 8) {
			higher.disabled = "true";
		}
		if (pen_size > 1) {
			lower.disabled = "";
		}
		size.innerHTML = pen_size + (eraser ? "E" : "");
	}

	pen.onclick = () => {
		eraser = false;
		size.innerHTML = pen_size;
	}

	// Clears the canvas
	erase.onclick = () => {
		eraser = true;
		size.innerHTML = pen_size + "E";
	}

	// Colors
	color_black.onclick = () => {
		context.strokeStyle = "#050505";
		size.style.color = "#353535";
	}

	color_white.onclick = () => {
		context.strokeStyle = "#aaaaaa";
		size.style.color = "#dddddd";
	}

	color_red.onclick = () => {
		context.strokeStyle = "#aa0505";
		size.style.color = "#dd3535";
	}

	color_green.onclick = () => {
		context.strokeStyle = "#05aa05";
		size.style.color = "#35dd35";
	}

	color_blue.onclick = () => {
		context.strokeStyle = "#0505aa";
		size.style.color = "#3535dd";
	}

}

// Sends a create request when create button is pressed
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

// Sends a join request when create button is join
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

// Clears error when an input is entered
function clear_error() {
	error.style.display = "none";
}