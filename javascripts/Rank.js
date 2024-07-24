class Rank {
	constructor(options){
		this.options = options
		if(this.options["sockets"] == 8){
			this.socket_arr = [3, 1, 7, 5, 2, 0, 6, 4]
		}else{
			this.socket_arr = new Array(this.options["sockets"])
			for(var i=0; i<this.options["sockets"]; i++){
				this.socket_arr[i] = i;
			}
		}
		this.node_allocation = {}; //task->node
		var task_number = 0;
		for(var node=0; node<this.options["nodes"]; node++){
			for(var k=0; k < parseInt(this.options["task"]/this.options["nodes"]); k++){
				this.node_allocation[task_number] = node;
				task_number++;
			}
			if(node<(this.options["task"]%this.options["nodes"])){
				this.node_allocation[task_number] = node;
				task_number++;
			}
		}
	}

	getPinning() {
		if(this.options["mode"] == "node") var outer_level = this.options["nodes"]; 
		else var outer_level = this.options["task"]; //Tasks/Nodes

		//Create Task Array
		var tasks = new Array(outer_level);
		for(var outer=0; outer<outer_level; outer++){ 
			tasks[outer] = new Array(this.options["sockets"]);
			for(var socket=0; socket<this.options["sockets"]; socket++){
				var array_for_task = new Array(document.getElementById("threads_per_core").max);
				for(var thread=0; thread<document.getElementById("threads_per_core").max;thread++){
					array_for_task[thread] = new Array(this.options["cores"]);
				}
				tasks[outer][socket] = array_for_task;
			}
		}

		//Fill the Task Array
		for(var task=0; task<this.options["task"]; task++){
			for(var cpu=0; cpu<this.options["cpu_per_task"]; cpu++){
				var [outer_pos, socket, thread, core] = this.getCoreToBind(task, cpu);
				tasks[outer_pos][socket][thread][core] = task;
			}
		}
		return tasks;
	}
	
	getCoreToBind(task, cpu){ 
		var node, socket, core, thread, number_of_cores, cores_per_socket, start_index = 0, task_number, current, tasks_in_node;
		
		//Distribution-Node
		if(this.options["distribution_node"] == 'block'){
			node = this.node_allocation[task];
			for(var key_node in this.node_allocation){
				if(this.node_allocation[key_node] == node) break; else start_index++;
			}
			task_number = task - start_index;
		}else{
			node = task%this.options["nodes"];
			task_number = Math.floor(task/this.options["nodes"]);
		}

		current = task_number*this.options["cpu_per_task"]+cpu;
		tasks_in_node = Math.floor(this.options["task"]/this.options["nodes"]);
		tasks_in_node += (node < this.options["task"]%this.options["nodes"]) ? 1 : 0

		//Distribution-Socket
		number_of_cores = Math.ceil(tasks_in_node * this.options["cpu_per_task"] / this.options["threads_per_core"]);
		thread = Math.floor(current/number_of_cores);
		//Block 
		if(this.options["distribution_socket"] == 'block'){
			socket = Math.floor((current - thread * number_of_cores) / this.options["cores"]);
			core = (current - thread * number_of_cores) % this.options["cores"]; 
		//Cyclic 
		}else if(this.options["distribution_socket"] == 'cyclic'){
			var cores_per_socket = this.getCoresPerSocket()

			var used_cores = thread * number_of_cores
			for (var s = 0; s < this.options["sockets"]; s++) {
				if (current < used_cores+cores_per_socket[s]) {
					socket = s
					core  = current - used_cores
					break
				}
				used_cores += cores_per_socket[s]
			}
		//Fcyclic
		}else if(this.options["distribution_socket"] == 'fcyclic'){
			cores_per_socket = Math.ceil(number_of_cores / this.options["sockets"]);
			socket = Math.floor((current - thread * number_of_cores) / cores_per_socket); 
			core = (current - thread * number_of_cores) % cores_per_socket;
		}

		if(this.options["mode"] == "task") var outer_pos = task; else var outer_pos = node;
		return [outer_pos, this.socket_arr[socket], thread, core];
	}

	getCoresPerSocket() {
		var cores_per_socket = new Array(this.options["sockets"]).fill(0);
		if(this.options["distribution_node"] == 'block'){
			var node = this.node_allocation[task]
		}else{
			var node = task%this.options["nodes"];
		}
		var tasks_in_node = Math.floor(this.options["task"]/this.options["nodes"]);
		if (node < this.options["task"]%this.options["nodes"]) {
			tasks_in_node = tasks_in_node +1;
		}
		if (this.options["distribution_socket"] == "cyclic") {
			var block = Math.ceil(this.options["cpu_per_task"]/this.options["threads_per_core"])
			var number_of_blocks = Math.floor((tasks_in_node*this.options["cpu_per_task"])/(block*this.options["threads_per_core"]))
			var socket = 0

			//allocate core-blocks
			for (var b = 0; b < number_of_blocks; b++) {
				cores_per_socket[socket] += block
				//if socket completely filled, use next socket
				while (cores_per_socket[socket] > this.options["cores"]) {
					var tmp = cores_per_socket[socket] - this.options["cores"]
					cores_per_socket[socket] = this.options["cores"]
					socket = (socket+1)%this.options["sockets"]
					cores_per_socket[socket] += tmp
				}
				socket = (socket+1)%this.options["sockets"]
			}

			//allocate remaining cores
			cores_per_socket[socket] += Math.ceil(((this.options["task"]*this.options["cpu_per_task"])%(block*this.options["threads_per_core"]))/this.options["threads_per_core"])
			//if socket completely filled, use next socket
			while (cores_per_socket[socket] > this.options["cores"]) {
				var tmp = cores_per_socket[socket] - this.options["cores"]
				cores_per_socket[socket] = this.options["cores"]
				socket = (socket+1)%this.options["sockets"]
				cores_per_socket[socket] += tmp
			}
		} else {
			//allocate full sockets
			for (var socket = 0; socket < this.options["sockets"]; socket++) {
				cores_per_socket[socket] = this.options["cores"]
			}
		}
		return cores_per_socket
	}
}
console.log("Done")