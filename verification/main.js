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
	let output = (rule_based) ? document.getElementById('output_calc') : document.getElementById('output_real');
	output.innerHTML = "";

	//get needed width and height or a bit more
	let width = 30 + (tasks[0].length + (tasks[0].length*tasks[0][0][0].length))*22;
	let height = tasks.length * tasks[0][0].length * 90;

	//create the svg element
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	if (rule_based) svg.setAttribute("id", "calc_content"); else svg.setAttribute("id", "real_content");

	//set width and height
	svg.setAttribute("width", width);
	svg.setAttribute("height", height);

	let margin = (tasks[0].length === 8) ? 50: 20;
	const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
	title.setAttribute("x", "10");
	title.setAttribute("y", "20");
	title.setAttribute("fill", "#023d6b");
	title.setAttribute("font-family", "Arial, Helvetica, sans-serif");
	title.setAttribute("font-weight", "bold");
	title.textContent = (rule_based) ? 'RULE-BASED:' : 'REAL SITUATION:';
	svg.appendChild(title);

	//generate the visualization of the pinning mask
	for(let i=0; i<tasks.length; i++){ //Tasks/Nodes
		const headline = document.createElementNS("http://www.w3.org/2000/svg", "text");
		headline.setAttribute("x", "10");
		headline.setAttribute("y", margin + i*(tasks[i][0].length+2)*22);
		headline.setAttribute("fill", "#023d6b");
		headline.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		headline.textContent = (options["mode"] === "task") ? "Task" : "Node";
		headline.textContent += i+':';
		svg.appendChild(headline);

		for(let j=0; j<tasks[i].length; j++){ //Sockets
			for(let k=0; k<tasks[i][j].length; k++){ //Threads
				for(let l=0; l<tasks[i][j][k].length; l++){ //Cores
					const core = document.createElementNS("http://www.w3.org/2000/svg", "rect");
					core.setAttribute("x", 30 + j*(tasks[i][j][k].length+1)*22 + l*22);
					core.setAttribute("y", margin + 10 + i*(tasks[i][j].length+2)*22 + k*22);
					core.setAttribute("width", "20");
					core.setAttribute("height", "20");

					//highlight difference
					if(diff[i][j][k][l]) {
						core.setAttribute("stroke-width", "3");
						core.setAttribute("stroke", "#ff0000");
					}

					const pin = document.createElementNS("http://www.w3.org/2000/svg", "text");
					let xoffset, yoffset, fontsize;
					if (tasks[i][j][k][l]>99) {
						xoffset = 6;
						yoffset = 1;
						fontsize = "0.7em";
					} else if (tasks[i][j][k][l]>9) {
						xoffset = 4;
						yoffset = 1;
						fontsize = "0.9em";
					} else {
						xoffset = 0;
						yoffset = 0;
						fontsize = "1.0em";
					}
					pin.setAttribute("x", 36 - xoffset + j*(tasks[i][j][k].length+1)*22 + l*22);
					pin.setAttribute("y", margin + 25 - yoffset + i*(tasks[i][j].length+2)*22 + k*22);
					pin.setAttribute("width", "30");
					pin.setAttribute("height", "30");
					pin.setAttribute("font-size", fontsize);

					if(tasks[i][j][k][l] !== undefined){
						pin.textContent = tasks[i][j][k][l];
						core.setAttribute("fill", utils.styles.colors[parseInt(tasks[i][j][k][l])%9]);
						pin.setAttribute("fill", 'white');
					}else{
						if(tasks[i].length === 8){
							core.setAttribute("fill", utils.styles.socket_color[parseInt(j/4)]);
						}else{
							core.setAttribute("fill", utils.styles.socket_color[j%2]);
						}
						pin.setAttribute("fill", '#023d6b');
						pin.textContent = 'x';
					}

					svg.appendChild(core);
					svg.appendChild(pin);
				}
			}
		}
	}

	// add gpus
	let gpus = utils.supercomputer_attributes[options["supercomputer"]]['gpus'];
	for(let i=0; i<gpus.length; i++){
		const gpuheadline = document.createElementNS("http://www.w3.org/2000/svg", "text");
		gpuheadline.setAttribute("x", 35 + gpus[i]*(tasks[0][0][0].length+1)*22);
		gpuheadline.setAttribute("y", 20);
		gpuheadline.setAttribute("fill", "#023d6b");
		gpuheadline.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		gpuheadline.setAttribute("font-weight", "bold");
		gpuheadline.textContent = 'Direct connection';
		svg.appendChild(gpuheadline);
		const gpuheadline2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
		gpuheadline2.setAttribute("x", 65 + gpus[i]*(tasks[0][0][0].length+1)*22);
		gpuheadline2.setAttribute("y", 40);
		gpuheadline2.setAttribute("fill", "#023d6b");
		gpuheadline2.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		gpuheadline2.setAttribute("font-weight", "bold");
		gpuheadline2.textContent = 'to GPU '+i;
		svg.appendChild(gpuheadline2);
		const gpurect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		gpurect.setAttribute("x", 25 + gpus[i]*(tasks[0][0][0].length+1)*22);
		gpurect.setAttribute("y", margin);
		gpurect.setAttribute("width", tasks[0][0][0].length*22 +8);
		gpurect.setAttribute("height", tasks.length * 60 + (tasks.length-1)* 28);
		gpurect.setAttribute("fill", "none");
		gpurect.setAttribute("stroke", "#023d6b");
		gpurect.setAttribute("stroke-width", "2");
		svg.appendChild(gpurect);
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
