/**
 * JuPin PinningTool
 * Copyright (C) 2020-2025
 * Forschungszentrum Juelich GmbH, Juelich Supercomputing Centre
 * http://www.fz-juelich.de/jsc/jupin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

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
		utils.switchZoom(document.getElementById('content'));
	});
	utils.adjustTooltipsPosition()
	document.getElementById("selection").addEventListener('scroll', function() {utils.adjustTooltipsPosition();});
	window.addEventListener('resize', function() {utils.adjustTooltipsPosition(); utils.keepZoom(document.getElementById('content'));});
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
	options["numa_sockets"] = utils.supercomputer_attributes[options["supercomputer"]]['numa_sockets'];
	options["phys_sockets"] = utils.supercomputer_attributes[options["supercomputer"]]['phys_sockets'];
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
	utils.createContent(tasks, document.getElementById('output'), "content", options)
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
		tasks[h] = new Array(options["numa_sockets"]);
		for(let numa_socket=0; numa_socket<options["numa_sockets"]; numa_socket++){
			let array_for_task = new Array(options["threads"]);
			for(let thread=0; thread<options["threads"];thread++){
				array_for_task[thread] = new Array(options["cores"]);
			}
			tasks[h][numa_socket] = array_for_task;
		}
	}

	//hex to bin
	let all_cores = options["numa_sockets"]*options["cores"]*options["threads"];
	let sub = "0".repeat(all_cores);
	for (let i = 0; i < hex.length; i++) {
		if (hex[i].match(/^0x[0123456789ABCDEF]+$/i)) {
			let dezi = BigInt(hex[i]);
			let bin = ((sub + dezi.toString(2)).split("").reverse().join("")).substring(0,all_cores);
			//Fill Task Array
			let bit = 0;
			for(let thread=0; thread<options["threads"];thread++){
				for(let numa_socket=0; numa_socket<options["numa_sockets"]; numa_socket++){
					for(let core=0; core<options["cores"]; core++){
						if(bin[bit] === '1') tasks[i][numa_socket][thread][core] = i.toString();
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
	
	utils.createContent(tasks, document.getElementById('output'), "content", options)
}
