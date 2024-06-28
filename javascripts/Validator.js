class Validator {
	constructor(options){
		this.options = options;
		this.available_cores = this.options["sockets"]*this.options["cores"]*this.options["nodes"] * this.options["threads_per_core"];
	}
	
	isValidOptions(){
		return this.available_cores >= this.options["task"]*this.options["cpu_per_task"];
	}
	
	isValidDistribution(){
		return this.options["cpu_bind"] == "rank" || this.options["cpu_bind"] == "rank_ldom" || !(this.options["distribution_socket"] == "fcyclic" && this.options["distribution_core"] == "cyclic")
	}
}
