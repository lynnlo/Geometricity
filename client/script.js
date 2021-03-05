// Copyright 2021 Lynn O. All rights reserved

// Define variables
var index
var game

var name_input
var id_input
var menu_button
var error

var players
var chat
var message
var send

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
var color_yellow
var color_teal
var color_magenta

var context
var socket

var draw = false;
var local_name;
var local_drawer = false;
var local_admin = false;

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
	menu_button = document.getElementById("menu_button");
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
	color_yellow = document.getElementById("color_yellow");
	color_teal = document.getElementById("color_teal");
	color_magenta = document.getElementById("color_magenta");

	players = document.getElementById("players");
	chat = document.getElementById("chat");
	message = document.getElementById("message")
	send = document.getElementById("send");

	time = document.getElementById("time");

	clear = document.getElementById("clear");
	lower = document.getElementById("lower");
	higher = document.getElementById("higher");
	size = document.getElementById("size");
	pen = document.getElementById("pen");
	erase = document.getElementById("erase");

	context = canvas.getContext("2d");

	// Clears error when an input is entered
	function key_press() {
		socket.emit("check", id_input.value, (response) => {
			error.style.display = "none";
			menu_button.style.display = "";
			if (response) {
				menu_button.onclick = join_game;
				menu_button.innerHTML = "Join Game";
			}
			else {
				menu_button.onclick = create_game;
				menu_button.innerHTML = "Create Game";
			}
		})
		
		setTimeout(() => {
			if (menu_button.style.display == "none") {
				error.innerHTML = "No compatible server was found, please try again later."
				error.style.display = "";
			}
		}, 1000)
	}

	key_press();

	// Canvas variables
	let pen_size = 1;
	let pen_color = "#050505";
	let eraser = false;

	name_input.value = Date.now().toString().slice(-6,-1) ;

	// Connection
	socket.on("disconnect", () => {
		console.log("connection failed")
		window.location.reload();
	})

	socket.on("create-success", (id, name) => {
		index.style.display = "none";
		game.style.display = "";
		room.innerHTML = "Room ID : " + id;
		local_name = name;
	})

	socket.on("join-success", (id, name) => {
		index.style.display = "none";
		game.style.display = "";
		room.innerHTML = "Room ID : " + id;
		local_name = name;
	})

	socket.on("connection-failed", () => {
		error.innerHTML = "Game ID or name invalid or taken.";
		error.style.display = "";
		setTimeout(() => {key_press()}, 1500);
	})

	socket.on("start-game", (name, list) => {
		drawer.innerHTML = "Drawer : " + name;

		let i = 0;
		choices.forEach((x) => {
			x.innerHTML = list[i];
			i += 1;

			x.onclick = () => {
				socket.emit("guess", x.innerHTML, (correct) => {
					if (correct == x.innerHTML) {
						choices.forEach((a) => {a.style.backgroundColor = "#402020"});
						x.style.backgroundColor = "#204020";
					}
					else {
						choices.forEach((a) => {a.style.backgroundColor = "#402020"});
						choices.forEach((a) => {
							if (a.innerHTML == correct){
								a.style.backgroundColor = "#204020";
							}
						})
					}
				})
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

			[...document.getElementsByClassName("color")].forEach((x) => {
				x.disabled = false;
			})
		}
		else {
			choices.forEach((x) => {
				x.disabled = false;
			})
		}
	})

	socket.on("reset-game", () => {
		// Resets every interface
		local_drawer = false;

		pen_size = 1;
		eraser = false;
		clear.disabled = true;
		higher.disabled = true;
		pen.disabled = true;
		erase.disabled = true;

		[...document.getElementsByClassName("color")].forEach((x) => {
			x.disabled = true;
		})

		size.innerHTML = pen_size + (eraser ? "E" : "");
		pen_color = "#050505";
		size.style.color = "#353535";

		context.clearRect(0, 0, canvas.width, canvas.height);

		choices.forEach((x) => {
			x.style.backgroundColor = "";
			x.disabled = true;
		})
	})

	socket.on("update-admin", (admin) => {
		local_admin = admin;
	})

	socket.on("update-players", (names, scores) => {
		let board = "<br>";
		let lines = 0;

		for (let i=0; i<names.length; i++){
			// Adds a kick button to all players if the player is an admin
			board += (local_admin ? "<button class='kicks'" + (names[i] == local_name ? "disabled='true'" : "") + "> Kick </button> "  : "") 
			
			// Display all player names
			board += (names[i] == local_name ? "<b>" + names[i] + "</b>" : names[i]) + " : " + scores[i] + "<br>";
			lines += 1;
		}

		for (lines; lines<30; lines++){
			board += "<br>";
		}

		console.log(names);
		console.log(board);

		players.innerHTML = board;
		
		// Sends the kick request to the server if their kick button is clicked
		[...document.getElementsByClassName("kicks")].forEach((x, i) => {
			x.onclick = () => {
				socket.emit("kick-request", names[i]);
			}
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

	socket.on("update-chat", (messages) => {
		let board = "<br>";
		let lines = 0;

		for (let i=0; i<messages.length; i++){
			board += messages[i][0] + " : " + messages[i][1] + "<br>";
			lines += 1;		
		}

		for (lines; lines<30; lines++){
			board += "<br>";
		}

		chat.innerHTML = board;
	})

	socket.on("time", (t) => {
		time.innerHTML = t + 1;
	})

	socket.on("kick", () => {
		window.location.reload();
	})

	// Calibration
	canvas.width = document.body.clientWidth * 0.35;
	canvas.height = canvas.width * (9 / 16);

	unit_size = 1 * (document.body.clientWidth / 500);
	unit = (n = 1) => { return n * unit_size };

	if (pen_size <= 1) {
		lower.disabled = "true";
	}
	else if (pen_size >= 8) {
		higher.disabled = "true";
	}

	// Start a path when mouse is down 
	canvas.addEventListener("mousedown", () => {
		if (local_drawer){
			draw = true;
			context.strokeStyle = (eraser ? "#353535" : pen_color);
			context.beginPath();
		}
	});

	// Adds a point to the path when mouse moves 
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

	// Close the path when the mouse is up 
	canvas.addEventListener("mouseup", () => {
		if (local_drawer){
			draw = false;
			context.closePath();
		}
	});

	// Close the path when the canvas loses focus
	canvas.addEventListener("mouseout", () => {
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

	// Pensize
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
		pen_color = "#050505";
		size.style.color = "#353535";
	}

	color_white.onclick = () => {
		pen_color = "#aaaaaa";
		size.style.color = "#dddddd";
	}

	color_red.onclick = () => {
		pen_color = "#aa0505";
		size.style.color = "#dd3535";
	}

	color_green.onclick = () => {
		pen_color = "#05aa05";
		size.style.color = "#35dd35";
	}

	color_blue.onclick = () => {
		pen_color = "#0505aa";
		size.style.color = "#3535dd";
	}

	color_yellow.onclick = () => {
		pen_color = "#aaaa05";
		size.style.color = "#dddd35";
		console.log("yellow")
	}

	color_teal.onclick = () => {
		pen_color = "#05aaaa";
		size.style.color = "#35dddd";
	}

	color_magenta.onclick = () => {
		pen_color = "#aa05aa";
		size.style.color = "#dd35dd";
	}

	// Sends a chat message to the server on click
	send.onclick = () => {
		socket.emit("send-message", message.value);
		message.value = "";
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