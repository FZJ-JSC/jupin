class Validator {
	constructor(sockets, cores, task, cpu_per_task, nodes, cpu_bind, distribution_socket, distribution_core, threads_per_core){
		this.task = task;
		this.cpu_per_task = cpu_per_task;
		this.distribution_socket = distribution_socket;
		this.distribution_core = distribution_core;
		this.cpu_bind = cpu_bind;
		this.cpu_per_task = cpu_per_task;
		this.available_cores = sockets*cores*nodes * threads_per_core;
	}
	
	isValidOptions(){
		return this.available_cores >= this.task*this.cpu_per_task;
	}
	
	isValidDistribution(){
		if (this.cpu_bind == "rank" || this.cpu_bind == "rank_ldom") return true;
		return true //!(this.distribution_socket == "fcyclic" && this.distribution_core == "cyclic");
	}
}
