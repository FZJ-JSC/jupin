
import { Cores } from './Cores.js';
import { Rank } from './Rank.js';
import { Rank_Ldom } from './Rank_Ldom.js';
import { Threads } from './Threads.js';

/**
 *Configurations
 */
export let styles =   {"colors": ["#7393dd", "#ff8200", "#0064b5", "#80c6ff", "#00467f",
								  "#b35b00", "#290aa3", "#ffc180" , "#1d0772"],
					   "phys_socket_color": ["rgba(2, 61, 107, 0.3)", "rgba(179, 83, 0, 0.3)"]};

export let supercomputer_attributes = {
	"jw": {"numa_sockets": 2, "phys_sockets": 2, "cores": 24, "threads": 2, "gpus": [],
		   "affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"},
	"jwg": {"numa_sockets": 2, "phys_sockets": 2, "cores": 20, "threads": 2, "gpus": [],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"},
	"jwb": {"numa_sockets": 8, "phys_sockets": 2, "cores": 6, "threads": 2,"gpus": [3,1,7,5],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"},
	"jr": {"numa_sockets": 8, "phys_sockets": 2, "cores": 16, "threads": 2, "gpus": [],
		   "affinity": "https://apps.fz-juelich.de/jsc/hps/jureca/affinity.html"},
	"jrg": {"numa_sockets": 8, "phys_sockets": 2, "cores": 16, "threads": 2,"gpus": [3,1,7,5],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/jureca/affinity.html"},
	"js": {"numa_sockets": 8, "phys_sockets": 2, "cores": 16, "threads": 2, "gpus": [],
		   "affinity": "https://apps.fz-juelich.de/jsc/hps/jusuf/affinity.html"},
	"jsg": {"numa_sockets": 8, "phys_sockets": 2, "cores": 16, "threads": 2, "gpus": [3],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/jusuf/affinity.html"},
	"jd": {"numa_sockets": 4, "phys_sockets": 4, "cores": 72, "threads": 1, "gpus": [],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/jedi/affinity.html"}};

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
		output.scrollLeft = 0;
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

	// Create the outer container that stores Slurm options
	var container = document.createElement("div");
	container.className = "code-container";

	// Create the header for title and copy button
	var titleBox = document.createElement("div");
	titleBox.className = "title-box";
	// Title
	var titleSpan = document.createElement("span");
	titleSpan.className = "title";
	titleSpan.textContent = "Slurm srun options";
	// Copy button
	var copyBtn = document.createElement("button");
	copyBtn.type = "button";
	copyBtn.className = "copy-btn";
	copyBtn.title = "Copy command";
	var icon = document.createElement("i");
	icon.className = "fa fa-copy";
	copyBtn.appendChild(icon);
	titleBox.appendChild(titleSpan);
	titleBox.appendChild(copyBtn);

	// Create the code block
	var codeContainer = document.createElement("div");
	codeContainer.className = "code-text";
	var codeElem = document.createElement("code");
	codeElem.id = 'slurmOptions';
	// Getting the text of Slurm options from the selected options
	if (options["mode"] === "hex2bin") {
		codeElem.textContent = '--cpu-bind=mask_cpu:' + options["hex2bin"];
	} else {
		codeElem.textContent = '-N ' + options["nodes"] + ' -n ' + options["task"] + ' -c ' + options["cpu_per_task"] + ' --cpu-bind=' + options["cpu_bind"] +
		' --distribution=' + options["distribution_node"] + ':' + options["distribution_socket"] + ':' + options["distribution_core"] +
		' --threads-per-core=' + options["threads_per_core"];
	}
	codeContainer.appendChild(codeElem);
	container.appendChild(titleBox);
	container.appendChild(codeContainer);

	// Clear any previous content and insert the new container
	command.appendChild(container);

	// Add copy-to-clipboard when clicking on the button
	copyBtn.addEventListener("click", copyToClipboard)
}

/**
 * Copy text to clipboard
 */
export function copyToClipboard() {
	var codeElem = document.getElementById('slurmOptions')
	var textToCopy = codeElem.textContent;
	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(textToCopy)
		.catch(function(err) {
			console.error("Error copying text: ", err);
		});
	} else {
		console.error("Cannot copy text");
	}
	return;
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

/**
 * Check if color is light or dark (to change font color)
 */
function isLightColor(color) { //<--color in the way '#RRGGBB
    if (color.length == 7) {
        const rgb = [
            parseInt(color.substring(1, 3), 16),
            parseInt(color.substring(3, 5), 16),
            parseInt(color.substring(5), 16),
        ];
        const luminance =
            (0.2126 * rgb[0]) / 255 +
            (0.7152 * rgb[1]) / 255 +
            (0.0722 * rgb[2]) / 255;
        return luminance > 0.5;
    }
    return false
}


/**
 * Generates the visualization for a given pinning mask
 */
export function createContent(tasks, output, id, options, diff=undefined, title=""){
	//get output div and empty
	output.innerHTML = "";
	let gpus = supercomputer_attributes[options["supercomputer"]]['gpus'];
	let numa_per_phys_socket = options["numa_sockets"] / options["phys_sockets"]

	//get needed width and height
	let thread_width = 20;
	let thread_height = 0.9*20;
	let space = 20;
	let info_height = 15
	let info_width = 60
	let phys_socket_height = options["threads"] * thread_height+info_height
	let total_phys_socket_height = phys_socket_height + space+info_height
	let numa_socket_width = options["cores"] * thread_width
	let total_numa_socket_width = numa_socket_width+space
	let phys_socket_width = numa_per_phys_socket*total_numa_socket_width-space
	let node_height = info_height + space + options["phys_sockets"] * total_phys_socket_height 
	let total_node_height = node_height + space
	let node_width = phys_socket_width + 2 * space
	let width = node_width + 2 * space;
	let height = space + tasks.length * total_node_height
	let title_height = (title === "") ? 0 : space;

	// create the svg element
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("id", id);

	// set width and height
	svg.setAttribute("width", width);
	svg.setAttribute("height", height);

	if (title !== "") {
		const svgtitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
		svgtitle.setAttribute("x", "10");
		svgtitle.setAttribute("y", space);
		svgtitle.setAttribute("fill", "#023d6b");
		svgtitle.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		svgtitle.setAttribute("font-weight", "bold");
		svgtitle.textContent = title;
		svg.appendChild(svgtitle);
	}

	//generate the visualization of the pinning mask
	for(let i=0; i<tasks.length; i++){ //Tasks/Nodes
		const node = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		node.setAttribute("x", space);
		node.setAttribute("y", space + total_node_height * i+title_height);
		node.setAttribute("width", node_width);
		node.setAttribute("height", node_height);
		node.setAttribute("fill", "#ebebeb");
		node.setAttribute("stroke-width", "1");
		node.setAttribute("stroke", "#023d6b");
		svg.appendChild(node);
		const headline = document.createElementNS("http://www.w3.org/2000/svg", "text");
		headline.setAttribute("x", 1.25*space);
		headline.setAttribute("y", title_height+ info_height + total_node_height * i + 1.25*space);
		headline.setAttribute("fill", "#023d6b");
		headline.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		headline.setAttribute("font-weight", "bold");
		headline.textContent = (options["mode"] === "node") ? "Node " : "Task ";
		headline.textContent += i+':';
		svg.appendChild(headline);

		for (let m=0; m < options["phys_sockets"]; m++) {//physical sockets
			const phys_socket = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			phys_socket.setAttribute("x", 1.75*space);
			phys_socket.setAttribute("y", title_height+ 1.75* space + total_node_height * i + total_phys_socket_height * m+2*info_height);
			phys_socket.setAttribute("width", phys_socket_width+0.5*space-0.1*thread_width);
			phys_socket.setAttribute("height", phys_socket_height+0.5*space);
			phys_socket.setAttribute("fill-opacity", "0");
			phys_socket.setAttribute("stroke-width", "1");
			phys_socket.setAttribute("stroke", "#888888");
			svg.appendChild(phys_socket);
			const infobox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			infobox.setAttribute("x", 1.75*space);
			infobox.setAttribute("y", title_height+ 1.75* space + total_node_height * i + total_phys_socket_height * m+info_height);
			infobox.setAttribute("width", info_width);
			infobox.setAttribute("height", info_height);
			infobox.setAttribute("fill", "#888888");
			infobox.setAttribute("stroke", "#888888");
			svg.appendChild(infobox);
			const sinfo = document.createElementNS("http://www.w3.org/2000/svg", "text");
			sinfo.setAttribute("x", 1.75*space+0.5*info_width);
			sinfo.setAttribute("y", title_height+ 1.75* space + total_node_height * i + total_phys_socket_height * m+1.6*info_height);
			sinfo.setAttribute("fill", "white");
			sinfo.setAttribute("font-family", "Arial, Helvetica, sans-serif");
			sinfo.setAttribute("font-size", "0.8em");
			sinfo.setAttribute("dominant-baseline", "middle");
			sinfo.setAttribute("text-anchor", "middle");
			sinfo.textContent = "Socket " + m
			svg.appendChild(sinfo)
			for(let j=0; j<numa_per_phys_socket; j++){ //NUMA-Sockets per physical socket
				let numa_socket = m*numa_per_phys_socket+j
				const info = document.createElementNS("http://www.w3.org/2000/svg", "text");
				info.setAttribute("x", 2*space + j * total_numa_socket_width);
				info.setAttribute("y", title_height+ 2* space + total_node_height * i + total_phys_socket_height * m+2.7*info_height);
				info.setAttribute("fill", "#023d6b");
				info.setAttribute("font-family", "Arial, Helvetica, sans-serif");
				info.setAttribute("font-size", "0.8em");
				sinfo.setAttribute("dominant-baseline", "middle");
				info.textContent = "NUMA " + numa_socket
				if (gpus.includes(numa_socket)) 
					info.textContent += " / GPU " + gpus.indexOf(numa_socket)
				svg.appendChild(info);
				for(let l=0; l<options["cores"]; l++){ //Cores
					for(let k=0; k<options["threads"]; k++){ //Threads
						const thread = document.createElementNS("http://www.w3.org/2000/svg", "rect");
						const thread_y = title_height+ 2* space + total_node_height * i + total_phys_socket_height * m + k * thread_height+3*info_height
						thread.setAttribute("x", 2*space + l * thread_width + j * total_numa_socket_width);
						thread.setAttribute("y", thread_y);
						thread.setAttribute("width", 0.9*thread_width);
						thread.setAttribute("height", thread_height);

						let fontsize;
						if (tasks[i][numa_socket][k][l]>99) {
							fontsize = "0.7em";
						} else if (tasks[i][numa_socket][k][l]>9) {
							fontsize = "0.8em";
						} else {
							fontsize = "0.9em";
						}
						const pin = document.createElementNS("http://www.w3.org/2000/svg", "text");
						pin.setAttribute("x", 2*space + (l+0.45) * thread_width + j * total_numa_socket_width);
						pin.setAttribute("y", thread_y+0.45*thread_width); // Position of the text is in the middle of the thread block
						pin.setAttribute("width", thread_width);
						pin.setAttribute("height", thread_height);
						pin.setAttribute("font-size", fontsize);
						pin.setAttribute("text-anchor", "middle");

						if(tasks[i][numa_socket][k][l] !== undefined){
							pin.textContent = tasks[i][numa_socket][k][l];
							let background_color = styles.colors[parseInt(tasks[i][numa_socket][k][l])%styles.colors.length];
							thread.setAttribute("fill", background_color);
							pin.setAttribute("fill", isLightColor(background_color)?'black':'white');
							pin.setAttribute("dominant-baseline", "central"); // Vertically align the numbers centered
						}else{
							thread.setAttribute("fill", 'rgba(61, 61, 61, 0.2)');
							pin.setAttribute("fill", '#023d6b');
							pin.setAttribute("dominant-baseline", "middle"); // Vertically align the non-capital 'x' centered
							pin.textContent = 'x';
						}
						svg.appendChild(thread);
						svg.appendChild(pin);

						if (k!==0){
							const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
							let y = title_height+ 2* space + total_node_height * i + total_phys_socket_height * m + k * thread_height+3*info_height;
							let x = 2*space + (l+0.45) * thread_width + j * total_numa_socket_width;
							line.setAttribute("x1", x-0.45*thread_width);
							line.setAttribute("y1", y);
							line.setAttribute("x2", x+0.45*thread_width);
							line.setAttribute("y2", y);
							line.setAttribute("stroke-dasharray","2,2");
							line.setAttribute("stroke","#023d6b")
							svg.appendChild(line);
						}
					}
					const core = document.createElementNS("http://www.w3.org/2000/svg", "rect");
					core.setAttribute("x", 2*space + l * thread_width + j * total_numa_socket_width);
					core.setAttribute("y", title_height+ 2* space + total_node_height * i + total_phys_socket_height * m+3*info_height);
					core.setAttribute("width", 0.9*thread_width);
					core.setAttribute("height", (options["threads"])*thread_height);
					core.setAttribute("fill-opacity", "0");
					core.setAttribute("stroke-width", "1");
					core.setAttribute("stroke", "#023d6b");
					svg.appendChild(core);
					if (diff !== undefined) {
						for(let k=0; k<options["threads"]; k++){ //Threads
							//highlight difference
							if(diff[i][numa_socket][k][l]) {
								const thread = document.createElementNS("http://www.w3.org/2000/svg", "rect");
								thread.setAttribute("x", 2*space + l * thread_width + j * total_numa_socket_width);
								thread.setAttribute("y", title_height+2* space + total_node_height * i + total_phys_socket_height * m + k * thread_height+3*info_height);
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