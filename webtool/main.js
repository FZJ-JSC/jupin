import { Validator } from './Validator.js';
import * as utils from './utils.js';

window.addEventListener("DOMContentLoaded", () => {
	getAndCompleteURL();
	switchDisabled(document.getElementById("mode").value,document.getElementById("supercomputer").value,document.getElementById("cpu_bind").value);
	generateForm();

	//Event Handler
	//document.querySelector(".alert .closebtn").addEventListener("click", function() {closeAlert(this);});
	document.getElementById("supercomputer").addEventListener("change", function() {
		switchDisabled(document.getElementById("mode").value,this.value,document.getElementById("cpu_bind").value);
		generateForm();
	});
	document.getElementById("mode").addEventListener("change", function() {
		switchDisabled(this.value,document.getElementById("supercomputer").value,document.getElementById("cpu_bind").value);
		generateForm();
	});
	document.getElementById("hex2bin").addEventListener("change", function() {generateForm();});
	document.getElementById("nodes").addEventListener("change", function() {generateForm();});
	document.getElementById("task").addEventListener("change", function() {generateForm();});
	document.getElementById("cpu_per_task").addEventListener("change", function() {generateForm();});
	document.getElementById("cpu_bind").addEventListener("change", function() {
		switchDisabled(document.getElementById("mode").value,document.getElementById("supercomputer").value,this.value);
		generateForm();
	});
	document.getElementById("threads_per_core").addEventListener("change", function() {generateForm();});
	document.getElementById("distribution_node").addEventListener("change", function() {generateForm();});
	document.getElementById("distribution_socket").addEventListener("change", function() {generateForm();});
	document.getElementById("distribution_core").addEventListener("change", function() {generateForm();});
	document.getElementById("zoom").addEventListener("click", function() {
		utils.switchZoom(this.getAttribute("src"), document.getElementById('content'), document.getElementById('output'));
	});
})

/**
 * Closes an alert
 */
function closeAlert(elem){
	let div = elem.parentElement;
	div.style.opacity = "0";
	setTimeout(function(){ div.style.display = "none"; }, 600);
}

/**
 * Disables unnecessary selectors for the given options
 */
function switchDisabled(mode,system,cpu_bind){
	utils.setAffinityLink(system);

	if (mode === 'hex2bin') {
		document.getElementById("hex2bin").disabled = false;
		document.getElementById("nodes").value = 1;
		document.getElementById("nodes").disabled = true;
		document.getElementById("task").disabled = true;
		document.getElementById("cpu_per_task").disabled = true;
		document.getElementById("cpu_bind").disabled = true;
		document.getElementById("threads_per_core").disabled = true;
		document.getElementById("distribution_node").disabled = true;
		document.getElementById("distribution_socket").disabled = true;
		document.getElementById("distribution_core").disabled = true;
	} else {
		document.getElementById("hex2bin").disabled = true;
		document.getElementById("task").disabled = false;
		document.getElementById("cpu_per_task").disabled = false;
		document.getElementById("cpu_bind").disabled = false;
		document.getElementById("distribution_node").disabled = false;
		document.getElementById("distribution_socket").disabled = false;
		document.getElementById('distribution_core').disabled = (cpu_bind === 'threads' || cpu_bind === 'cores') ? false : true;
		if (utils.supercomputer_attributes[system]['threads'] === 1) {
			document.getElementById("threads_per_core").value = 1;
			document.getElementById("threads_per_core").disabled = true;
		} else {
			document.getElementById("threads_per_core").max = utils.supercomputer_attributes[system]['threads'];
			document.getElementById("threads_per_core").disabled = false;
		}
		if(mode === 'task'){
			document.getElementById("nodes").value = 1;
			document.getElementById("nodes").disabled = true;
		}else{
			document.getElementById("nodes").disabled = false;
		}
	}
}

/**
 * Reads the URL parameters to get the selected options
 */
function getAndCompleteURL(){
	//read out parameters
	const help_parameters = (window.location.search.slice(1)).split('&');
	if(help_parameters[0] !== ""){
		//set selects and inputs
		for (let i = 0; i<help_parameters.length; i++){
			let key = help_parameters[i].split('=')[0];
			let value = decodeURIComponent(help_parameters[i].split('=')[1]);
			let input = document.getElementById(key);
			input.value = value;
		}
	}
}

/**
 * Gets the options used for the selected pinning setup.
 */
function getOptions() {
	let options = {};
	//Get all parameter for supercomputer
	options["supercomputer"] = document.getElementById('supercomputer').value;
	options["sockets"] = utils.supercomputer_attributes[options["supercomputer"]]['sockets'];
	options["cores"] = utils.supercomputer_attributes[options["supercomputer"]]['cores'];
	options["threads"] = utils.supercomputer_attributes[options["supercomputer"]]['threads'];

	//Get all parameter for tasks
	options["task"] = parseInt(document.getElementById('task').value);
	options["cpu_per_task"] = parseInt(document.getElementById('cpu_per_task').value);
	options["nodes"] = parseInt(document.getElementById('nodes').value);
	options["threads_per_core"] = parseInt(document.getElementById('threads_per_core').value);
	options["mode"] = document.getElementById("mode").value;

	//Get all parameter for bind options
	options["cpu_bind"] = document.getElementById('cpu_bind').value;
	options["distribution_node"] = document.getElementById('distribution_node').value;
	options["distribution_socket"] = document.getElementById('distribution_socket').value;
	options["distribution_core"] = document.getElementById('distribution_core').value;

	//Get all parameter for hex2bin
	options["hex2bin"] = document.getElementById('hex2bin').value.replace(/\s+/g, '');

	return options;
}

/**
 * Creates the pinning masks for the selected pinning setup and starts the visualization.
 * Generates a warning if the visualization is not possible.
 */
function generateForm() {
	let options = getOptions();
	if (options["mode"] === "hex2bin"){
		hex2Bin(options);
		return;
	}
	let output = document.getElementById('output');
	utils.setURL();

	//Validator
	let validator = new Validator(options);
	if(!validator.isValidOptions()){
		if(options["mode"] === 'task') output.innerHTML = '<div id="warning">Output not possible. Possible Problems: <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of tasks is too high or <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of CPU \'s per task too high <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of threads per core too low</div>';
		if(options["mode"] === 'node') output.innerHTML = '<div id="warning">Output not possible. Possible Problems: <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of tasks is too high or <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of CPU \'s per task too high <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of nodes too low <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of threads per core too low</div>';
		return;
	}
	if(!validator.isImplemented()){
		output.innerHTML = '<div id="warning"><i class="fa fa-cog fa-spin"></i> This version is currently not available</div>';
		return;
	}
	utils.createCommand(options);

	let tasks = utils.getCalcPinning(options);
	createContent(tasks, options);
}

/**
 * Generates the visualization for a given pinning mask
 */
function createContent(tasks, options){
	//get output div and empty
	let output = document.getElementById('output');
	output.innerHTML = "";
	let gpus = utils.supercomputer_attributes[options["supercomputer"]]['gpus'];
	let numa_per_socket = (options["sockets"] == 8) ? 4 : 1;

	//get needed width and height
	let thread_width = 20;
	let thread_height = 0.9*20;
	let space = 20;
	let info_height = 15
	let socket_height = options["threads"] * thread_height+info_height
	let numa_width = options["cores"] * thread_width
	let socket_width = numa_per_socket*numa_width+(numa_per_socket-1)*space
	let node_height = (options["sockets"]/numa_per_socket) * socket_height + ((options["sockets"]/numa_per_socket) + 2) * space
	let node_width = socket_width + 2 * space
	let width = node_width + 2 * space;
	let height = tasks.length * node_height + (tasks.length + 1) * space

	// create the svg element
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("id", "content");

	// set width and height
	svg.setAttribute("width", width);
	svg.setAttribute("height", height);

	for(let i=0; i<tasks.length; i++){ //Tasks/Nodes
		const node = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		node.setAttribute("x", space);
		node.setAttribute("y", space + (node_height + space) * i);
		node.setAttribute("width", node_width);
		node.setAttribute("height", node_height);
		node.setAttribute("fill", "#ebebeb");
		node.setAttribute("stroke-width", "1");
		node.setAttribute("stroke", "#023d6b");
		svg.appendChild(node);
		const headline = document.createElementNS("http://www.w3.org/2000/svg", "text");
		headline.setAttribute("x", space+10);
		headline.setAttribute("y", space + (node_height + space) * i + 20);
		headline.setAttribute("fill", "#023d6b");
		headline.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		headline.setAttribute("font-weight", "bold");
		headline.textContent = (options["mode"] === "node") ? "Node " : "Task ";
		headline.textContent += i+':';
		svg.appendChild(headline);

		for(let j=0; j<options["sockets"]; j++){ //Sockets
			const socket = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			socket.setAttribute("x", 2*space -0.25*space);
			socket.setAttribute("y", 3* space + (node_height + space) * i + (socket_height + space) * Math.floor(j/numa_per_socket)-0.25*space);
			socket.setAttribute("width", socket_width+0.5*space-0.1*thread_width);
			socket.setAttribute("height", socket_height+0.5*space);
			socket.setAttribute("fill-opacity", "0");
			socket.setAttribute("stroke-width", "1");
			socket.setAttribute("stroke", "#ADBDE3");
			svg.appendChild(socket);
			const info = document.createElementNS("http://www.w3.org/2000/svg", "text");
			info.setAttribute("x", 2*space + (j%numa_per_socket) * (numa_width+space));
			info.setAttribute("y", 3* space + (node_height + space) * i + (socket_height + space) * Math.floor(j/numa_per_socket)+0.7*info_height);
			info.setAttribute("fill", "#023d6b");
			info.setAttribute("font-family", "Arial, Helvetica, sans-serif");
			info.setAttribute("font-size", "0.8em");
			info.setAttribute("dominant-baseline", "auto");
			info.textContent = "NUMA " + j
			if (gpus.includes(j)) 
				info.textContent += " / GPU " + gpus.indexOf(j)
			svg.appendChild(info);
			for(let l=0; l<options["cores"]; l++){ //Cores
				for(let k=0; k<options["threads"]; k++){ //Threads
					const thread = document.createElementNS("http://www.w3.org/2000/svg", "rect");
					thread.setAttribute("x", 2*space + l * thread_width + (j%numa_per_socket) * (numa_width+space));
					thread.setAttribute("y", 3* space + (node_height + space) * i + (socket_height + space) * Math.floor(j/numa_per_socket) + k * thread_height+info_height);
					thread.setAttribute("width", 0.9*thread_width);
					thread.setAttribute("height", thread_height);

					let fontsize;
					if (tasks[i][j][k][l]>99) {
						fontsize = "0.7em";
					} else if (tasks[i][j][k][l]>9) {
						fontsize = "0.8em";
					} else {
						fontsize = "0.9em";
					}
					const pin = document.createElementNS("http://www.w3.org/2000/svg", "text");
					pin.setAttribute("x", 2*space + (l+0.45) * thread_width + (j%numa_per_socket) * (numa_width+space));
					pin.setAttribute("y", 3* space + (node_height + space) * i + (socket_height + space) * Math.floor(j/numa_per_socket) + (k+0.55) * thread_height+info_height);
					pin.setAttribute("width", thread_width);
					pin.setAttribute("height", thread_height);
					pin.setAttribute("font-size", fontsize);
					pin.setAttribute("text-anchor", "middle");
					pin.setAttribute("dominant-baseline", "middle");

					if(tasks[i][j][k][l] !== undefined){
						pin.textContent = tasks[i][j][k][l];
						thread.setAttribute("fill", utils.styles.colors[parseInt(tasks[i][j][k][l])%9]);
						pin.setAttribute("fill", 'white');
					}else{
						thread.setAttribute("fill", utils.styles.socket_color[parseInt(j/numa_per_socket)%2]);
						pin.setAttribute("fill", '#023d6b');
						pin.textContent = 'x';
					}

					svg.appendChild(thread);
					svg.appendChild(pin);
				}
				const core = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				core.setAttribute("x", 2*space + l * thread_width + (j%numa_per_socket) * (numa_width+space));
				core.setAttribute("y", 3* space + (node_height + space) * i + (socket_height + space) * Math.floor(j/numa_per_socket)+info_height);
				core.setAttribute("width", 0.9*thread_width);
				core.setAttribute("height", (options["threads"])*thread_height);
				core.setAttribute("fill-opacity", "0");
				core.setAttribute("stroke-width", "1");
				core.setAttribute("stroke", "#023d6b");
				svg.appendChild(core);
			}
		}
	}

	//keep zoom
	let src = document.getElementById('zoom').getAttribute("src");
	let div_width = output.clientWidth;
	let scale = div_width/width;
	if(src === "images/plus.png"){
		svg.style.transform = "scale("+scale+")";
		svg.style.transformOrigin  = "top left";
	}else{
		svg.style.transform = "scale(1)";
	}

	// attach container to document
	output.appendChild(svg);
}

/**
 * Creates the pinning masks for a given hexmask and starts the visualization.
 * Generates a warning if the hexmask is invalid.
 */
function hex2Bin(options){
	let hex = options["hex2bin"].replace(/\s+/g, '');
	hex = hex.split(",");
	utils.setURL();
	utils.createCommand(options);

	//Create Task Array
	let tasks = new Array(hex.length);
	for (let h=0; h < hex.length; h++){
		tasks[h] = new Array(options["sockets"]);
		for(let socket=0; socket<options["sockets"]; socket++){
			let array_for_task = new Array(options["threads"]);
			for(let thread=0; thread<options["threads"];thread++){
				array_for_task[thread] = new Array(options["cores"]);
			}
			tasks[h][socket] = array_for_task;
		}
	}

	//hex to bin
	let all_cores = options["sockets"]*options["cores"]*options["threads"];
	let sub = "0".repeat(all_cores);
	for (let i = 0; i < hex.length; i++) {
		if (hex[i].match(/^0x[0123456789ABCDEF]+$/i)) {
			let dezi = BigInt(hex[i]);
			let bin = ((sub + dezi.toString(2)).split("").reverse().join("")).substring(0,all_cores);
			//Fill Task Array
			let bit = 0;
			for(let thread=0; thread<options["threads"];thread++){
				for(let socket=0; socket<options["sockets"]; socket++){
					for(let core=0; core<options["cores"]; core++){
						if(bin[bit] === '1') tasks[i][socket][thread][core] = i.toString();
						bit++;
					}
				}
			}
		} else {
			//Warning
			let output = document.getElementById('output');
			output.innerHTML = '<div id="warning">Output not possible. Possible Problems: <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Pinning-Mask is invalid</div>';
			return;
		}
	}
	createContent(tasks, options);
}
