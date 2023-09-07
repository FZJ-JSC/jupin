//Abbruchbedingung passt nicht ganz
class Rank {
	constructor(nodes, sockets, cores, threads_per_cores, distribution_node, distribution_socket, hint, task, cpus_per_task){
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
		this.hint = hint;

		this.node_allocation = {}; //task->node
		var task_number = 0;
		for(var node=0; node<this.nodes; node++){
			for(var k=0; k < parseInt(task/this.nodes); k++){
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
		var node, socket, thread, number_of_threads, core, start_index = 0, task_number, current, tasks_in_node;
		
		//Distribution-Node
		if(this.distribution_node == 'block'){
			node = this.node_allocation[task];
			for(var key_node in this.node_allocation){
				if(this.node_allocation[key_node] == node) break; else start_index++;
			}
			task_number = task - start_index;
		}else{
			node = task%this.nodes;
			task_number = parseInt(task/this.nodes);
		}

		current = task_number*cpus_per_task+cpu;
		tasks_in_node = parseInt(this.tasks/this.nodes);
		if (node < this.tasks%this.nodes) {
			tasks_in_node = tasks_in_node +1;
		}

		//Distribution-Socket 
		if (this.hint == "-") {
			if (cpus_per_task == 1) {
				number_of_threads = parseInt(tasks_in_node / this.threads_per_cores + 0.75);
			} else {
				number_of_threads = parseInt(cpus_per_task/this.threads_per_cores + 0.75) * tasks_in_node;
			}
			thread = parseInt(current / number_of_threads);
		} else {
			number_of_threads = tasks_in_node * cpus_per_task;
			thread = 0;
		}

		var s = -1
		var interval_begin = 0
		var interval_end = 0;

		//Block 
		if(this.distribution_socket == 'block'){
			while (current % number_of_threads >= interval_end) {
				s = (s + 1) % this.sockets;
				interval_begin = interval_end
				interval_end += this.cores;
			}
		//Cyclic 
		}else if(this.distribution_socket == 'cyclic'){
				var step_size = parseInt(cpus_per_task / this.threads_per_cores + 0.75);
				if (this.hint != "-") step_size = cpus_per_task;
				var interval = 0;
			while (current % number_of_threads >= interval_end) {
				s = (s + 1) % this.sockets;
				interval_begin = interval_end;
				interval += parseInt(parseInt(number_of_threads / step_size) / this.sockets) * step_size;
				if (s < parseInt(number_of_threads / step_size) % this.sockets) interval += step_size;
				if (interval >= this.cores) {
					interval_end += this.cores;
					interval -= this.cores;
				} else {
					interval_end += interval;
					interval = 0;
				}
			}
		//Fcyclic
		}else if(this.distribution_socket == 'fcyclic'){
			while (current % number_of_threads >= interval_end) {
				s = (s + 1) % this.sockets;
				interval_begin = interval_end
				interval_end += parseInt(number_of_threads / this.sockets);
				if (s < number_of_threads % this.sockets) interval_end += 1;
			}
		}
		socket = this.socket_arr[s];

		core = (current - interval_begin) % number_of_threads;

		return [node, socket, thread, core]
	}
}
