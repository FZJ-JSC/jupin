class Rank_Ldom {
	constructor(nodes, sockets, cores, threads, distribution_node, distribution_socket, threads_per_core, task){
		this.nodes = nodes;
		this.tasks = task;
		this.sockets = sockets;
		if(sockets == 8){
			this.socket_arr = [3, 1, 7, 5, 2, 0, 6, 4]
		}else{
			this.socket_arr = new Array(sockets)
			for(var i=0; i<sockets; i++){
				this.socket_arr[i] = i;
			}
		}
		this.cores = cores;
		this.threads = threads;
		this.distribution_node = distribution_node;
		this.distribution_socket = distribution_socket;
		this.threads_per_core = threads_per_core

		this.binded = new Array(nodes);
		for(var node=0; node<nodes; node++){
			this.binded[node] = new Array(sockets);
			for(var socket=0; socket<sockets; socket++){
				var array_for_task = new Array(threads);
				for(var thread=0; thread<threads; thread++){
					array_for_task[thread] = new Array(cores);
					for(var core=0; core<cores; core++){
						array_for_task[thread][core] = 'n';
					}
				}
				this.binded[node][socket] = array_for_task;
			}
		}

		this.node_allocation = {}; //task->node
		var task_number = 0;
		for(var node=0; node<this.nodes; node++){
			for(var k=0; k < Math.floor(task/this.nodes); k++){
				this.node_allocation[task_number] = node;
				task_number++;
			}
			if(node<(task%this.nodes)){
				this.node_allocation[task_number] = node;
				task_number++;
			}
		}
	}
	
	getCoreToBind(task, cpus_per_task, cpu){
		var node, socket, core, thread, number_of_cores, cores_per_socket, start_index = 0, task_number, current, tasks_in_node;
		
		//Distribution-Node
		if(this.distribution_node == 'block'){
			node = this.node_allocation[task];
			for(var key_node in this.node_allocation){
				if(this.node_allocation[key_node] == node) break; else start_index++;
			}
			task_number = task - start_index;
		}else{
			node = task%this.nodes;
			task_number = Math.floor(task/this.nodes);
		}

		current = task_number*cpus_per_task+cpu;
		tasks_in_node = Math.floor(this.tasks/this.nodes);
		tasks_in_node += (node < this.tasks%this.nodes) ? 1 : 0

		//Distribution-Socket
		core = Math.floor((Math.floor(task_number / this.sockets) * cpus_per_task + cpu) / this.threads_per_core);
		thread = (Math.floor(task_number / this.sockets) * cpus_per_task + cpu) % this.threads_per_core;
		//Block 
		if(this.distribution_socket == 'block'){
			var number_of_sockets = Math.ceil(tasks_in_node * cpus_per_task/(this.cores * this.threads_per_core))
			socket = task_number % number_of_sockets;
			cores_per_socket = Math.ceil(Math.ceil(tasks_in_node * cpus_per_task / this.threads_per_core) % this.cores);
			if (cores_per_socket == 0) cores_per_socket = this.cores;
			if (core >= cores_per_socket) return this.getNextUnbindedCore(task, cpus_per_task, cpu);
		//Cyclic 
		}else if(this.distribution_socket == 'cyclic'){
			socket = task_number % this.sockets;
			if (core >= this.cores) core = this.cores - 1; 
			thread = (Math.floor(task_number / this.sockets) * cpus_per_task + cpu) % this.threads_per_core;
		//Fcyclic
		}else if(this.distribution_socket == 'fcyclic'){
			socket = task_number % this.sockets;
			cores_per_socket = Math.ceil(Math.ceil(tasks_in_node * cpus_per_task / this.threads_per_core) / this.sockets);
			while (core >= cores_per_socket) {
				socket  = socket + 1;
				var diff = (core - cores_per_socket) * this.threads_per_core + thread;
				core = Math.floor((Math.floor(task_number / this.sockets) * cpus_per_task + diff) / this.threads_per_core);
				thread = (Math.floor(task_number / this.sockets) * cpus_per_task + diff) % this.threads_per_core;
			}
		}

		socket = this.socket_arr[socket];

		if(!this.isBinded(node, socket, thread, core)){
			this.bindCore(node, socket, thread, core);
			return [node, socket, thread, core];
		}else{
			return this.getNextUnbindedCore(task, cpus_per_task, cpu);
		}
	}
	
	getNextUnbindedCore(task, cpus_per_task, cpu){
		if(this.distribution_node == 'block'){
			var node = this.node_allocation[task];
		}else{
			var node = task%this.nodes;
		}
		
		for(var socket=0; socket<this.sockets; socket++){
			for(var core=0; core<this.cores; core++){
				for(var thread=0; thread<this.threads_per_core; thread++){
					if(!this.isBinded(node, this.socket_arr[socket], thread, core)){
						this.bindCore(node, this.socket_arr[socket], thread, core);
						return [node, this.socket_arr[socket], thread, core];
					}
				}
			}
			
		}
		
		return null;
	}
	
	bindCore(node, socket, thread, core){
		this.binded[node][socket][thread][core] = 'y';
	}
	
	isBinded(node, socket, thread, core){
		return this.binded[node][socket][thread][core] == 'y';
	}
}
