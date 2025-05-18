/**
 * JuPin PinningTool
 * Copyright (C) 2020-2025
 * Forschungszentrum Juelich GmbH, Juelich Supercomputing Centre
 * http://www.fz-juelich.de/jsc/jupin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { CPU_Bind } from './CPU_Bind.js';

export class Rank extends CPU_Bind{
	/**
	 * Calculates for a specific CPU of a specific task to which numa_socket, core and thread it is pinned.
	 */
	getCoreToBind(tasks, node, task_number, cpu){
		let current = task_number*this._options["cpu_per_task"]+cpu;
		let tasks_in_node = Math.floor(this._options["task"]/this._options["nodes"]);
		tasks_in_node += (node < this._options["task"]%this._options["nodes"]) ? 1 : 0;

		let numa_socket, core;
		let number_of_cores = Math.ceil(tasks_in_node * this._options["cpu_per_task"] / this._options["threads_per_core"]);
		let thread = Math.floor(current/number_of_cores);

		//Distribution-Socket Block
		if(this._options["distribution_socket"] === 'block'){
			numa_socket = Math.floor((current - thread * number_of_cores) / this._options["cores"]);
			core = (current - thread * number_of_cores) % this._options["cores"];

		//Distribution-Socket Cyclic
		}else if(this._options["distribution_socket"] === 'cyclic'){
			let used_cores = thread * number_of_cores;
			for (let s = 0; s < this._options["numa_sockets"]; s++) {
				if (current < used_cores+this._cores_per_numa_socket[node][s]) {
					numa_socket = s;
					core  = current - used_cores;
					break;
				}
				used_cores += this._cores_per_numa_socket[node][s];
			}

		//Distribution-Socket Fcyclic
		}else if(this._options["distribution_socket"] === 'fcyclic'){
			numa_socket = Math.floor((current - thread * number_of_cores) / this._cores_per_numa_socket[node][0]);
			core = (current - thread * number_of_cores) % this._cores_per_numa_socket[node][numa_socket];
		}

		return [this._numa_socket_arr[numa_socket], thread, core];
	}
}
