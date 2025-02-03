export class Validator {
	constructor(options){
		this._options = options;
		this._available_cores = this._options["sockets"]*this._options["cores"]*this._options["nodes"] * this._options["threads_per_core"];
	}
	
	isValidOptions(){
		return this._available_cores >= this._options["task"]*this._options["cpu_per_task"];
	}
	
	isValidDistribution(){
		return this._options["cpu_bind"] === "rank" || this._options["cpu_bind"] === "rank_ldom" || !(this._options["distribution_socket"] === "fcyclic" && this._options["distribution_core"] === "cyclic");
	}
}
