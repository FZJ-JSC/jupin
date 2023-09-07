class Validator {
	constructor(sockets, cores, threads_per_cores, task, cpu_per_task, nodes, cpu_bind, mode, distribution_node, distribution_socket, distribution_core, hint){
		this.task = task;
		this.cpu_per_task = cpu_per_task;
		this.distribution_socket = distribution_socket;
		this.distribution_core = distribution_core;
		this.cpu_bind = cpu_bind;
		this.nodes = nodes;
		this.sockets = sockets;
		this.cores = cores;
		this.threads_per_cores = threads_per_cores;
		this.cpu_per_task = cpu_per_task;
		this.available_cores = sockets*cores*nodes;
		this.hint = hint
		if(hint == "-") this.available_cores *= threads_per_cores;
	}
	
	isValidOptions(){
		if (this.cpu_bind == "rank" && this.hint == "-") {
			var max_tasks_in_node = parseInt(this.task/this.nodes);
			if (this.task % this.nodes != 0) max_tasks_in_node += 1;
			return (this.cpu_per_task == 1 && parseInt(max_tasks_in_node / 2 + 0.5) <= this.cores * this.sockets) 
					|| parseInt(this.cpu_per_task / this.threads_per_cores + 0.75) * max_tasks_in_node <= this.cores * this.sockets
		}
		return this.available_cores >= this.task*this.cpu_per_task;
	}
	
	isValidDistribution(){
		if (this.cpu_bind == "rank" || this.cpu_bind == "rank_ldom") return true;
		return !(this.distribution_socket == "fcyclic" && this.distribution_core == "cyclic");
	}
}
