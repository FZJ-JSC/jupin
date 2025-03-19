export class CPU_Bind {
	constructor(options){
		this._options = options;
		if(this._options["numa_sockets"] === 8){
			this._numa_socket_arr = [3, 1, 7, 5, 2, 0, 6, 4];
		}else{
			this._numa_socket_arr = new Array(this._options["numa_sockets"]);
			for(let i=0; i<this._options["numa_sockets"]; i++){
				this._numa_socket_arr[i] = i;
			}
		}
		this._node_allocation = {}; //task->node
		let task_number = 0;
		this._last = new Array(this._options["nodes"]);
		this._cores_per_numa_socket = new Array(this._options["nodes"]);
		for(let node=0; node<this._options["nodes"]; node++){
			this._last[node] = new Array(3); //task, numa_socket, core
			this._cores_per_numa_socket[node] = this.getCoresPerNumaSocket(node);
			for(let k=0; k < parseInt(this._options["task"]/this._options["nodes"]); k++){
				this._node_allocation[task_number] = node;
				task_number++;
			}
			if(node<(this._options["task"]%this._options["nodes"])){
				this._node_allocation[task_number] = node;
				task_number++;
			}
		}
	}

	/**
	 * Calculates the pinning for the given options
	 */
	getPinning() {
		let outer_level = (this._options["mode"] === "node") ? this._options["nodes"] : this._options["task"];

		//Create Task Array
		let tasks = new Array(outer_level);
		for(let outer=0; outer<outer_level; outer++){
			tasks[outer] = new Array(this._options["numa_sockets"]);
			for(let numa_socket=0; numa_socket<this._options["numa_sockets"]; numa_socket++){
				let array_for_task = new Array(this._options["threads"]);
				for(let thread=0; thread<this._options["threads"];thread++){
					array_for_task[thread] = new Array(this._options["cores"]);
				}
				tasks[outer][numa_socket] = array_for_task;
			}
		}

		//Fill the Task Array
		for(let task=0; task<this._options["task"]; task++){
			//Distribution-Node
			let node, task_number;
			if(this._options["distribution_node"] === 'block'){
				node = this._node_allocation[task];
				let start_index = 0;
				for(let key_node in this._node_allocation){
					if(this._node_allocation[key_node] === node) break; else start_index++;
				}
				task_number = task - start_index;
			}else{
				node = task%this._options["nodes"];
				task_number = Math.floor(task/this._options["nodes"]);
			}
			let outer_pos = (this._options["mode"] === "task") ? task : node;

			//Distribution-Socket and -Core
			for(let cpu=0; cpu<this._options["cpu_per_task"]; cpu++){
				let [numa_socket, thread, core] = this.getCoreToBind(tasks, node, task_number, cpu);
				if(this.isBinded(tasks, node, numa_socket, thread, core)){
					[numa_socket, thread, core] = this.getNextUnbindedCore(tasks, node, task_number);
				}
				if (this._options["mode"] === "task") this._last[0] = [task_number, numa_socket, core]; else this._last[node] = [task_number, numa_socket, core];
				tasks[outer_pos][numa_socket][thread][core] = task;
			}
		}

		//Fill all Threads for CPU-Bind cores
		if (this._options["cpu_bind"] === "cores") {
			for (let o = 0; o < tasks.length; o++) {
				for (let s = 0; s < this._options["numa_sockets"]; s++) {
					for (let c = 0; c < this._options["cores"]; c++) {
						let max = -1;
						for (let t = 0; t < this._options["threads_per_core"]; t++) {
							if (tasks[o][s][t][c] !== undefined) max = Math.max(max, tasks[o][s][t][c]);
						}
						if (max !== -1) {
							for (let t = 0; t < this._options["threads_per_core"]; t++) {
								tasks[o][s][t][c] = max;
							}
						}
					}
				}
			}
		}

		return tasks;
	}

	/**
	 * Finds the next free thread from the last pinned position within a given node
	 */
	getNextUnbindedCore(tasks, node, task_number, core_cyclic = false){
		let numa_socket = this._numa_socket_arr.indexOf(this._last[node][1]);
		//change numa_socket, if new task
		if (this._last[node][0] !== task_number || (core_cyclic && this._last[node][2] == this._cores_per_numa_socket[node][numa_socket] -1)) {
			numa_socket = (numa_socket + 1) % this._options["numa_sockets"];
		}

		//search unbinded core
		for (let s = numa_socket; s < numa_socket + this._options["numa_sockets"]; s++) {
			for(let core=0; core<this._cores_per_numa_socket[node][s%this._options["numa_sockets"]]; core++){
				for(let thread=0; thread<this._options["threads_per_core"]; thread++){
					if(!this.isBinded(tasks,node, this._numa_socket_arr[s%this._options["numa_sockets"]], thread, core)){
						return [this._numa_socket_arr[s%this._options["numa_sockets"]], thread, core];
					}
				}
			}
		}

		return null;
	}

	/**
	 * Calculates for each numa_socket of a given node how many cores within the numa_sockets can be used for pinning
	 */
	getCoresPerNumaSocket(node) {
		let cores_per_numa_socket = new Array(this._options["numa_sockets"]).fill(0);
		let tasks_in_node = Math.floor(this._options["task"]/this._options["nodes"]);
		if (node < this._options["task"]%this._options["nodes"]) {
			tasks_in_node = tasks_in_node +1;
		}

		if (this._options["distribution_socket"] === "cyclic") {
			let block = Math.ceil(this._options["cpu_per_task"]/this._options["threads_per_core"]);
			let number_of_blocks = Math.floor((tasks_in_node*this._options["cpu_per_task"])/(block*this._options["threads_per_core"]));
			let numa_socket = 0;

			//allocate core-blocks
			for (let b = 0; b < number_of_blocks; b++) {
				cores_per_numa_socket[numa_socket] += block;
				//if numa_socket is completely filled, use the next numa_socket
				while (cores_per_numa_socket[numa_socket] > this._options["cores"]) {
					let tmp = cores_per_numa_socket[numa_socket] - this._options["cores"];
					cores_per_numa_socket[numa_socket] = this._options["cores"];
					numa_socket = (numa_socket+1)%this._options["numa_sockets"];
					cores_per_numa_socket[numa_socket] += tmp;
				}
				numa_socket = (numa_socket+1)%this._options["numa_sockets"];
			}

			//allocate remaining cores
			cores_per_numa_socket[numa_socket] += Math.ceil(((tasks_in_node*this._options["cpu_per_task"])%(block*this._options["threads_per_core"]))/this._options["threads_per_core"]);
			//if numa_socket is completely filled, use the next numa_socket
			while (cores_per_numa_socket[numa_socket] > this._options["cores"]) {
				let tmp = cores_per_numa_socket[numa_socket] - this._options["cores"];
				cores_per_numa_socket[numa_socket] = this._options["cores"];
				numa_socket = (numa_socket+1)%this._options["numa_sockets"];
				cores_per_numa_socket[numa_socket] += tmp;
			}
		} else {
			//allocate full numa_sockets
			for (let numa_socket = 0; numa_socket < this._options["numa_sockets"]; numa_socket++) {
				cores_per_numa_socket[numa_socket] = this._options["cores"];
			}
		}
		return cores_per_numa_socket;
	}

	/**
	 * Checks whether a specific thread in a given core, numa_socket and node is already binded
	 */
	isBinded(tasks, node, numa_socket, thread, core){
		if (this._options["mode"] === "node") {
			return tasks[node][numa_socket][thread][core]!== undefined;
		} else {
			for(let task=0; task<this._options["task"]; task++){
				if (tasks[task][numa_socket][thread][core] !== undefined) return true;
			}
			return false;
		}
	}
}
