
import { Cores } from './Cores.js';
import { Rank } from './Rank.js';
import { Rank_Ldom } from './Rank_Ldom.js';
import { Threads } from './Threads.js';

/**
 *Configurations
 */
export let styles =   {"colors": ["#7393dd", "#ff8200", "#0064b5", "#80c6ff", "#00467f",
								  "#b35b00", "#290aa3", "#ffc180" , "#1d0772"],
					   "socket_color": ["rgba(2, 61, 107, 0.3)", "rgba(179, 83, 0, 0.3)"]};

export let supercomputer_attributes = {
	"jw": {"sockets": 2, "cores": 24, "threads": 2, "gpus": [],
		   "affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"},
	"jwg": {"sockets": 2, "cores": 20, "threads": 2, "gpus": [],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"},
	"jwb": {"sockets": 8, "cores": 6, "threads": 2,"gpus": [3,1,7,5],
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
 * Zooms in/out on a given svg-element
 */
export function switchZoom(src,svg,output,change=true){
    if(!svg) return;
	let div_width = output.clientWidth;
	let svg_width = svg.clientWidth;
	let scale = div_width/svg_width;
	//zoom out
	if(src === "images/minus.png"){
		if (change) document.getElementById('zoom').setAttribute("src", "images/plus.png");
		svg.style.transform = "scale("+scale+")";
		svg.style.transformOrigin  = "top left";
	//zoom in
	}else{
		if (change) document.getElementById('zoom').setAttribute("src", "images/minus.png");
		svg.style.transform = "scale(1)";
	}
	output.classList.toggle("zoomed")
}

/**
 * Sets the affinity-link for a given system
 */	
export function setAffinityLink(supercomputer){
    let link = document.getElementById('affinity');
    link.href = supercomputer_attributes[supercomputer].affinity;
}

/**
 * Gets the values of all input and select elements and adds them to the URL
 */
export function setURL(){
    const url = new URL(window.location);
	let selects = document.getElementsByTagName('select');
	let inputs = document.getElementsByTagName('input');
	for (let i=0; i<selects.length; i++) {
		url.searchParams.set(selects[i].id, selects[i].value.toLowerCase());
	}
	for (let i=0; i<inputs.length; i++) {
		url.searchParams.set(inputs[i].id, inputs[i].value.toLowerCase().replace(/\s+/g, ''));
	}
    window.history.replaceState({}, '', url);
}

/**
 * Creates Slurm-compatible command-line options for the choosen pinning-setup
 */
export function createCommand(options){
	let command = document.getElementById('command');
	command.innerHTML = "";
	let p = document.createElement('code');
	if (options["mode"] === "hex2bin") {
		p.innerHTML = '--cpu-bind=mask_cpu:' + options["hex2bin"];
	} else {
		p.innerHTML = '-N ' + options["nodes"] + ' -n ' + options["task"] + ' -c ' + options["cpu_per_task"] + ' --cpu-bind=' + options["cpu_bind"] +
		' --distribution=' + options["distribution_node"] + ':' + options["distribution_socket"] + ':' + options["distribution_core"] +
		' --threads-per-core=' + options["threads_per_core"];
	}

	p.style.textAlign = "center";
	command.appendChild(p);
}

/**
 * Generates the pinning mask for the calculated pinning
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