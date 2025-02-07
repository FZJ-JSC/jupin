export class Validator {
	constructor(options){
		this._options = options;
		this._available_cores_per_node = this._options["sockets"]*this._options["cores"] * this._options["threads_per_core"];
	}

	/**
	 * Checks whether the selected options are valid
	 * (whether the specified tasks and cpus per tasks can be pinned to the requested number of nodes and threads per core)
	 */
	isValidOptions(){
		let max_task_per_node = Math.ceil(this._options["task"]/this._options["nodes"])
		return this._available_cores_per_node >= max_task_per_node*this._options["cpu_per_task"];
	}

	/**
	 * Checks whether a calculation for the pinning is implemented for the selected options
	 */
	isImplemented(){
		return this._options["cpu_bind"] === "rank" || this._options["cpu_bind"] === "rank_ldom" ||
				!(this._options["distribution_socket"] === "fcyclic" && this._options["distribution_core"] === "cyclic");
	}
}
