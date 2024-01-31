class Rank {
	constructor(nodes, sockets, cores, threads_per_cores, distribution_node, distribution_socket, hint, task){
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
		this.threads_per_cores = threads_per_cores;
		this.distribution_node = distribution_node;
		this.distribution_socket = distribution_socket;
		this.threads = (hint == '-') ? threads_per_cores : 1
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
		number_of_cores = Math.ceil(tasks_in_node * cpus_per_task / this.threads);
		thread = Math.floor(current/number_of_cores);
		//Block 
		if(this.distribution_socket == 'block'){
			socket = Math.floor((current - thread * number_of_cores) / this.cores);
			core = (current - thread * number_of_cores) % this.cores; 
		//Cyclic 
		}else if(this.distribution_socket == 'cyclic'){
			cores_per_socket = Math.ceil(Math.ceil(tasks_in_node / this.sockets) * cpus_per_task / this.threads); 
			cores_per_socket = Math.min(cores_per_socket, this.cores)
			socket = Math.floor((current - thread * number_of_cores) / cores_per_socket); 
			core = (current - thread * number_of_cores) % cores_per_socket; 
		//Fcyclic
		}else if(this.distribution_socket == 'fcyclic'){
			cores_per_socket = Math.ceil(number_of_cores / this.sockets);
			socket = Math.floor((current - thread * number_of_cores) / cores_per_socket); 
			core = (current - thread * number_of_cores) % cores_per_socket;
		}

		return [node, this.socket_arr[socket], thread, core]
	}
}
