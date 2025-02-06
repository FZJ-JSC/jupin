import { Validator } from './Validator.js';
import * as utils from './utils.js';

window.addEventListener("DOMContentLoaded", () => {
	getAndCompleteURL();
	utils.setURL();
	switchMode(document.getElementById("mode").value);
	switchSystem(document.getElementById("supercomputer").value);

	//Event Handler
	//document.querySelector(".alert .closebtn").addEventListener("click", function() {closeAlert(this);});
	document.getElementById("supercomputer").addEventListener("change", function() {switchSystem(this.value);});
	document.getElementById("mode").addEventListener("change", function() {switchMode(this.value);});
	document.getElementById("hex2bin").addEventListener("change", function() {hex2Bin(this.value);});
	document.getElementById("nodes").addEventListener("change", function() {generateForm();});
	document.getElementById("task").addEventListener("change", function() {generateForm();});
	document.getElementById("cpu_per_task").addEventListener("change", function() {generateForm();});
	document.getElementById("cpu_bind").addEventListener("change", function() {switchCPUBind(this.value);});
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
 * Disables unnecessary selectors for the given mode
 */
function switchMode(mode){
	//switch mode to task and disable hexmask and nodes
	if(mode === 'task'){
		document.getElementById("hex2bin").disabled = true;
		document.getElementById("nodes").value = 1;
		document.getElementById("nodes").disabled = true;
		document.getElementById("task").disabled = false;
		document.getElementById("cpu_per_task").disabled = false;
		document.getElementById("cpu_bind").disabled = false;
		document.getElementById("threads_per_core").disabled = false;
		document.getElementById("distribution_node").disabled = false;
		document.getElementById("distribution_socket").disabled = false;
		switchCPUBind(document.getElementById("cpu_bind").value);
	//switch mode to node and disable hexmask
	}else if(mode === 'node'){
		document.getElementById("hex2bin").disabled = true;
		document.getElementById("nodes").disabled = false;
		document.getElementById("task").disabled = false;
		document.getElementById("cpu_per_task").disabled = false;
		document.getElementById("cpu_bind").disabled = false;
		document.getElementById("threads_per_core").disabled = false;
		document.getElementById("distribution_node").disabled = false;
		document.getElementById("distribution_socket").disabled = false;
		switchCPUBind(document.getElementById("cpu_bind").value);
	//switch mode to hex2bin and disable all
	}else{
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
		hex2Bin(document.getElementById("hex2bin").value);
	}
}

/**
 * Adjusts the affinity link and the maximum number of threads for the given system
 */
function switchSystem(system){
	utils.setAffinityLink(system);
	document.getElementById("threads_per_core").max = utils.supercomputer_attributes[system]['threads'];
	if (document.getElementById("mode").value === "hex2bin"){
		hex2Bin(document.getElementById("hex2bin").value);
	} else {
		generateForm();
	}
}

/**
 * Disables unnecessary selectors for the given cpu-bind option.
 */
function switchCPUBind(cpu_bind){
	document.getElementById('distribution_core').disabled = (cpu_bind === 'threads' || cpu_bind === 'cores') ? false : true;
	generateForm();
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

	//get needed width and height or a bit more
	let width = 30 + (tasks[0].length + (tasks[0].length*tasks[0][0][0].length))*22;
	let height = tasks.length * tasks[0][0].length * 90;

	// create the svg element
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("id", "content");

	// set width and height
	svg.setAttribute("width", width);
	svg.setAttribute("height", height);

	let margin = (tasks[0].length === 8) ? 50 : 20;
	//generate the visualization of the pinning mask
	for(let i=0; i<tasks.length; i++){ //Tasks/Nodes
		const headline = document.createElementNS("http://www.w3.org/2000/svg", "text");
		headline.setAttribute("x", "10");
		headline.setAttribute("y", margin + i*(tasks[i][0].length+2)*22);
		headline.setAttribute("fill", "#023d6b");
		headline.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		headline.textContent = (options["mode"] === "node") ? "Node" : "Task";
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

					const pin = document.createElementNS("http://www.w3.org/2000/svg", "text");
					let xoffset,yoffset,fontsize;
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
							core.setAttribute("fill", utils.styles.socket_color[j]);
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
 * Creates the pinning masks for a given hexmask and starts the visualization.
 * Generates a warning if the hexmask is invalid.
 */
function hex2Bin(hex){
	hex = hex.replace(/\s+/g, '');
	hex = hex.split(",");
	let options = getOptions();
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
