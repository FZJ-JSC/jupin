import { CPU_Bind } from './CPU_Bind.js';

export class Rank_Ldom extends CPU_Bind{
	/**
	 * Calculates for a specific CPU of a specific task to which numa_socket, core and thread it is pinned.
	 */
	getCoreToBind(tasks, node, task_number, cpu){
		let tasks_in_node = Math.floor(this._options["task"]/this._options["nodes"]);
		tasks_in_node += (node < this._options["task"]%this._options["nodes"]) ? 1 : 0;
		let numa_socket, core, thread;

		//Distribution-Socket Block 
		if(this._options["distribution_socket"] === 'block'){
			numa_socket = task_number % Math.ceil(tasks_in_node * this._options["cpu_per_task"]/(this._options["cores"] * this._options["threads_per_core"]));
			core = Math.floor((Math.floor(task_number / this._options["numa_sockets"]) * this._options["cpu_per_task"] + cpu) / this._options["threads_per_core"]);
			thread = (Math.floor(task_number / this._options["numa_sockets"]) * this._options["cpu_per_task"] + cpu) % this._options["threads_per_core"];
			if (core >= this._cores_per_numa_socket[node][numa_socket]) return this.getNextUnbindedCore(tasks,node,task_number);

		//Distribution-Socket Cyclic
		}else if(this._options["distribution_socket"] === 'cyclic'){
			return this.getNextUnbindedCore(tasks, node, task_number);

		//Distribution-Socket Fcyclic
		}else if(this._options["distribution_socket"] === 'fcyclic'){
			numa_socket = task_number % this._options["numa_sockets"];
			while (core >= this._cores_per_numa_socket[node][numa_socket]) {
				numa_socket  = numa_socket + 1;
				let diff = (core - this._cores_per_numa_socket[node][numa_socket]) * this._options["threads_per_core"] + thread;
				core = Math.floor((Math.floor(task_number / this._options["numa_sockets"]) * this._options["cpu_per_task"] + diff) / this._options["threads_per_core"]);
				thread = (Math.floor(task_number / this._options["numa_sockets"]) * this._options["cpu_per_task"] + diff) % this._options["threads_per_core"];
			}
		}

		return [this._numa_socket_arr[numa_socket], thread, core];
	}
}
