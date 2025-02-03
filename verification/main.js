import { Cores } from '../webtool/javascripts/Cores.js';
import { Rank } from '../webtool/javascripts/Rank.js';
import { Rank_Ldom } from '../webtool/javascripts/Rank_Ldom.js';
import { Threads } from '../webtool/javascripts/Threads.js';

let supercomputer_attributes = {
	"jw": {"sockets": 2, "cores": 24, "threads": 2, "gpus": [],
	  		"affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"}, 
	"jwg": {"sockets": 2, "cores": 20, "threads": 2, "gpus": [],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"}, 
	"jwb" : {"sockets": 8, "cores": 6, "threads": 2,"gpus": [3,1,7,5],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"}, 
	"jr": {"sockets": 8, "cores": 16, "threads": 2, "gpus": [],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/jureca/affinity.html"}, 
	"jrg": {"sockets": 8, "cores": 16, "threads": 2,"gpus": [3,1,7,5],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/jureca/affinity.html"},
	"js": {"sockets": 8, "cores": 16, "threads": 2, "gpus": [],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/jusuf/affinity.html"}, 
	"jsg": {"sockets": 8, "cores": 16, "threads": 2, "gpus": [3],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/jusuf/affinity.html"}};

/**
* Get used options for the (selected) file
*/
export function getOptions(file) {
	let options = {};
	let testcase = file.replace(".out","").split("-");

	options["supercomputer"] = testcase[0];
	options["sockets"] = supercomputer_attributes[options["supercomputer"]]['sockets']; 
	options["cores"] = supercomputer_attributes[options["supercomputer"]]['cores']; 
	options["threads"] = supercomputer_attributes[options["supercomputer"]]['threads']; 
	options["nodes"] = parseInt(testcase[1]);
	options["task"] = parseInt(testcase[2]);
	options["cpu_per_task"] = parseInt(testcase[3]);
	options["threads_per_core"] = parseInt(testcase[4]);
	options["cpu_bind"] = testcase[5];
	options["distribution_node"] = testcase[6];
	options["distribution_socket"] = testcase[7];
	options["distribution_core"] = testcase[8];
	options["mode"] = (options["nodes"] === 1) ? "task" : "node";

	return options;
}

/**
 * Creates pinning-array for the file
 */
export function createTasksFromFile(file_array, options) {
	let outer_level = (options["mode"] === "node") ? options["nodes"] : options["task"];

	//Create Task Array
	let tasks = new Array(outer_level);
	let threads = supercomputer_attributes[options["supercomputer"]]['threads'];
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
 * Generate the calculated pinning mask
 */
export function getCalcPinning(options) {
	let CPU_Bind;
	switch(options["cpu_bind"]){
		case 'rank':
			CPU_Bind = new Rank(options);
			break;
		case 'rank_ldom':
			CPU_Bind = new Rank_Ldom(options);
			break;
		case 'threads':
			CPU_Bind = new Threads(options);
			break;
		case 'cores':
			CPU_Bind = new Cores(options); 
			break;
	}
	return CPU_Bind.getPinning();
}