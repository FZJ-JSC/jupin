import { Validator } from './Validator.js';
import * as utils from './utils.js';

if (typeof window !== "undefined") {
	window.addEventListener("DOMContentLoaded", async () => {
		let data = await fetch('results.json')
		.then(res => {return res.json();})
		.then(json => {return json;})
		.catch(err => {return {
			equal: new Array(),
			unequal: new Array(),
			unknown: new Array()
		};});
		getAndCompleteURL(data);
		generateForm();

		//Event Handler
		document.getElementById("mode").addEventListener("change", function() {
			changeFiles(this.value, document.getElementById("category").value, data); generateForm();
		});
		document.getElementById("category").addEventListener("change", function() {
			changeFiles(document.getElementById("mode").value, this.value, data); generateForm();
		});
		document.getElementById("file").addEventListener("change", function() {generateForm();});
		document.getElementById("zoom").addEventListener("click", function() {
			utils.switchZoom(this.getAttribute("src"), document.getElementById('calc_content'), document.getElementById('output_calc'),false);
			utils.switchZoom(this.getAttribute("src"), document.getElementById('real_content'), document.getElementById('output_real'));
		});
		document.getElementById("output_calc").addEventListener("scroll", function() {
			syncScroll(this, document.getElementById('output_real'));
		});
		document.getElementById("output_real").addEventListener("scroll", function() {
			syncScroll(this, document.getElementById('output_calc'));
		});
	})
}

/**
 * Synchronizes the scrollbars for the real and calculated pinning-visualization
 */
function syncScroll(div1, div2) {
	div2.scrollTop = div1.scrollTop;
	div2.scrollLeft = div1.scrollLeft;
}

/**
 * Reads the URL parameters to get the selected options
 */
function getAndCompleteURL(data){
	//read the url parameters
	const help_parameters = (window.location.search.slice(1)).split('&');

	let parameters = {};
	for (let i = 0; i<help_parameters.length; i++){
		let key = help_parameters[i].split('=')[0];
		let value = help_parameters[i].split('=')[1];
		parameters[key] = value;
	}
	const keys = ["mode", "category", "file"];

	//set the values of the select elements
	for (let key of keys){
		if (key === "file") 
			changeFiles(document.getElementById("mode").value, document.getElementById("category").value, data);
		if (key in parameters) {
			let input = document.getElementById(key);
			let values = Array.from(input.options).map(option => option.value);
			if (values.length === 0 || values.includes(parameters[key]))
				input.value = parameters[key];
		}
	}
}

/**
 * Creates the pinning masks for the real and calculated pinning and starts the visualization.
 * Generates a warning if the visualization is not possible.
 */
async function generateForm() {
	utils.setURL()
	let file = document.getElementById('file').value;
	//generate a warning, if no file/setup is selected
	if (file === "") {
		document.getElementById('affinity').removeAttribute("href");
		document.getElementById('command').innerHTML = "";
		document.getElementById("difference").innerHTML = "";
		let output_calc = document.getElementById('output_calc');
		let output_real = document.getElementById('output_real');
		output_calc.innerHTML = '<div id="warning"><i class="fa fa-cog fa-spin"></i> There are no files for these options</div>';
		output_real.style.height = "0%";
		output_calc.style.height = "100%";
		return;
	}
	let options = getOptions(file);

	utils.setAffinityLink(options["supercomputer"]);
	utils.createCommand(options);

	//create the pinning mask for the real pinning
	let real_tasks = await fetch("pin_logs/"+file)
	.then((res) => {
		if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
		return res.text();
	})
	.then((text) => {
		let file_array = text.split("\n");
		for(let i = 0; i < file_array.length-1; i++) {
			file_array[i] = file_array[i].trim().split(/\s+/);
		}
		let tasks = createTasksFromFile(file_array, options);
		return tasks;
	})
	.catch((e) => {return undefined;});

	//create the pinning mask for he calculated pinning
	let calc_tasks = undefined;
	let validator = new Validator(options);
	if (validator.isImplemented()) {
		calc_tasks = utils.getCalcPinning(options);
	}
	createOutput(real_tasks, calc_tasks, options);
}

/**
 * Identifies the differences between the real and calculated pinning and 
 * generates the visualization of the pinning.
 */
function createOutput(real_tasks, calc_tasks, options) {
	let outer_level = (options["mode"] == "node") ? options["nodes"] : options["task"];

	//identify differences
	let diff = new Array(outer_level);
	for(let outer=0; outer<outer_level; outer++){
		diff[outer] = new Array(options["sockets"]);
		for(let socket=0; socket<options["sockets"]; socket++){
			let array_for_diff = new Array(options["threads"]);
			for(let thread=0; thread<options["threads"];thread++){
				array_for_diff[thread] = new Array(options["cores"]);
			}
			diff[outer][socket] = array_for_diff;
		}
	}

	document.getElementById("difference").innerHTML = "";
	if (calc_tasks) {
		let diff_count = 0;
		for(let i=0; i<diff.length; i++) {
			for(let j=0; j<diff[i].length; j++) {
				for(let k=0; k<diff[i][j].length; k++) {
					for(let l=0; l<diff[i][j][k].length; l++) {
						if (real_tasks[i][j][k][l] != calc_tasks[i][j][k][l])
							diff_count++;
						diff[i][j][k][l] = (real_tasks != undefined && real_tasks[i][j][k][l] != calc_tasks[i][j][k][l]);
					}
				}
			}
		}
		document.getElementById("difference").innerHTML = diff_count + " Difference(s)";
		if (diff_count > 0) document.getElementById("difference").style.color = "#eb5f73";
		else document.getElementById("difference").style.color = "black";
	}
	

	//generate visualization
	let output_calc = document.getElementById('output_calc');
	let output_real = document.getElementById('output_real');

	if(calc_tasks) {
		output_real.style.height = "calc(50% - 15px)";
		output_calc.style.height = "calc(50% - 15px)";
		createContent(calc_tasks, diff, options, true);
		createContent(real_tasks, diff, options, false);
	} else {
		output_calc.style.height = "20px";
		output_real.style.height = "calc(100% - 50px)";
		createContent(real_tasks, diff, options, false);
		output_calc.innerHTML = "There is no rule-based version for these options!";
	}
}

/**
 * Generates the visualization for a given pinning mask
 */
function createContent(tasks, diff, options, rule_based){
	//get output div and empty
	let output = (rule_based) ? document.getElementById('output_calc') : document.getElementById('output_real');
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
	if (rule_based) svg.setAttribute("id", "calc_content"); else svg.setAttribute("id", "real_content");

	// set width and height
	svg.setAttribute("width", width);
	svg.setAttribute("height", height);

	const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
	title.setAttribute("x", "10");
	title.setAttribute("y", space);
	title.setAttribute("fill", "#023d6b");
	title.setAttribute("font-family", "Arial, Helvetica, sans-serif");
	title.setAttribute("font-weight", "bold");
	title.textContent = (rule_based) ? 'RULE-BASED:' : 'REAL SITUATION:';
	svg.appendChild(title);

	//generate the visualization of the pinning mask
	for(let i=0; i<tasks.length; i++){ //Tasks/Nodes
		const node = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		node.setAttribute("x", space);
		node.setAttribute("y", 2*space + (node_height + space) * i);
		node.setAttribute("width", node_width);
		node.setAttribute("height", node_height);
		node.setAttribute("fill", "#ebebeb");
		node.setAttribute("stroke-width", "1");
		node.setAttribute("stroke", "#023d6b");
		svg.appendChild(node);
		const headline = document.createElementNS("http://www.w3.org/2000/svg", "text");
		headline.setAttribute("x", space+10);
		headline.setAttribute("y", 2* space + (node_height + space) * i + 20);
		headline.setAttribute("fill", "#023d6b");
		headline.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		headline.setAttribute("font-weight", "bold");
		headline.textContent = (options["mode"] === "node") ? "Node " : "Task ";
		headline.textContent += i+':';
		svg.appendChild(headline);

		for(let j=0; j<options["sockets"]; j++){ //Sockets
			const socket = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			socket.setAttribute("x", 2*space -0.25*space);
			socket.setAttribute("y", 4* space + (node_height + space) * i + (socket_height + space) * Math.floor(j/numa_per_socket)-0.25*space);
			socket.setAttribute("width", socket_width+0.5*space-0.1*thread_width);
			socket.setAttribute("height", socket_height+0.5*space);
			socket.setAttribute("fill-opacity", "0");
			socket.setAttribute("stroke-width", "1");
			socket.setAttribute("stroke", "#ADBDE3");
			svg.appendChild(socket);
			const info = document.createElementNS("http://www.w3.org/2000/svg", "text");
			info.setAttribute("x", 2*space + (j%numa_per_socket) * (numa_width+space));
			info.setAttribute("y", 4* space + (node_height + space) * i + (socket_height + space) * Math.floor(j/numa_per_socket)+0.7*info_height);
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
					thread.setAttribute("y", 4* space + (node_height + space) * i + (socket_height + space) * Math.floor(j/numa_per_socket) + k * thread_height+info_height);
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
					pin.setAttribute("y", 4* space + (node_height + space) * i + (socket_height + space) * Math.floor(j/numa_per_socket) + (k+0.55) * thread_height+info_height);
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
				core.setAttribute("y", 4* space + (node_height + space) * i + (socket_height + space) * Math.floor(j/numa_per_socket) +info_height);
				core.setAttribute("width", 0.9*thread_width);
				core.setAttribute("height", (options["threads"])*thread_height);
				core.setAttribute("fill-opacity", "0");
				core.setAttribute("stroke-width", "1");
				core.setAttribute("stroke", "#023d6b");
				svg.appendChild(core);
				for(let k=0; k<options["threads"]; k++){ //Threads
					//highlight difference
					if(diff[i][j][k][l]) {
						const thread = document.createElementNS("http://www.w3.org/2000/svg", "rect");
						thread.setAttribute("x", 2*space + l * thread_width + (j%numa_per_socket) * (numa_width+space));
						thread.setAttribute("y", 4* space + (node_height + space) * i + (socket_height + space) * Math.floor(j/numa_per_socket) + k * thread_height+info_height);
						thread.setAttribute("width", 0.9*thread_width);
						thread.setAttribute("height", thread_height);
						thread.setAttribute("fill-opacity","0")
						thread.setAttribute("stroke-width", "3");
						thread.setAttribute("stroke", "#ff0000");
						svg.appendChild(thread);
					}
				}
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
 * Gets the options used for the selected pinning setup/file.
 */
export function getOptions(file) {
	let options = {};
	let testcase = file.replace(".out","").split("-");

	options["supercomputer"] = testcase[0];
	options["sockets"] = utils.supercomputer_attributes[options["supercomputer"]]['sockets'];
	options["cores"] = utils.supercomputer_attributes[options["supercomputer"]]['cores'];
	options["threads"] = utils.supercomputer_attributes[options["supercomputer"]]['threads'];
	options["nodes"] = parseInt(testcase[1]);
	options["task"] = parseInt(testcase[2]);
	options["cpu_per_task"] = parseInt(testcase[3]);
	options["threads_per_core"] = parseInt(testcase[4]);
	options["cpu_bind"] = testcase[5];
	options["distribution_node"] = testcase[6];
	options["distribution_socket"] = testcase[7];
	options["distribution_core"] = testcase[8];
	if (typeof window === "undefined")
		options["mode"] = "node";
	else
		options["mode"] = document.getElementById("mode").value;

	return options;
}

/**
 * Generates the pinning mask for the data read from a file
 */
export function createTasksFromFile(file_array, options) {
	let outer_level = (options["mode"] === "node") ? options["nodes"] : options["task"];

	//Create Task Array
	let tasks = new Array(outer_level);
	let threads = utils.supercomputer_attributes[options["supercomputer"]]['threads'];
	for(let outer=0; outer<outer_level; outer++){
		tasks[outer] = new Array(options["sockets"]);
		for(let socket=0; socket<options["sockets"]; socket++){
			let array_for_task = new Array(threads);
			for(let thread=0; thread<threads;thread++){
				array_for_task[thread] = new Array(options["cores"]);
			}
			tasks[outer][socket] = array_for_task;
		}
	}

	//Fill the Task Array
	let node_map = new Map();
	for(let i = 0; i < file_array.length - 1; i++) {
		let rank = parseInt(file_array[i][0]);
		let position = parseInt(file_array[i][2]);
		if (!node_map.has(file_array[i][3])) {
			node_map.set(file_array[i][3], node_map.size);
		}
		let node = node_map.get(file_array[i][3]);
		let socket = parseInt(position / options["cores"]) % options["sockets"];
		let core = position % options["cores"];
		let thread = parseInt(position / (options["cores"] * options["sockets"]));
		let out = (options["mode"] === 'task') ? rank : node;
		if (options["cpu_bind"] === "cores") {
			for(let t=0; t<options["threads_per_core"]; t++) {
				tasks[out][socket][t][core] = rank;
			}
		} else {
			tasks[out][socket][thread][core] = rank;
		}
	}
	return tasks;
}

/**
 * Displays all pinning setups/files that are relevant for the current mode and category
 */
function changeFiles(mode, category, data) {
	const select = document.getElementById("file");

	let options = select.getElementsByTagName("option");
	while (options.length > 0) {
		options[0].remove();
	}

	const items = (mode == "node") ? data[category] : data[category].filter(item => item.split("-")[1] === "1");
	for (let item of items) {
		let optgroup = document.getElementById(item.split("-")[0]);
		const option = document.createElement("option");
		option.value = item;
		option.text = item; 
		optgroup.appendChild(option);
	}
}
