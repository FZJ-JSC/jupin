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

export class Validator {
	constructor(options){
		this._options = options;
		this._available_cores_per_node = this._options["numa_sockets"]*this._options["cores"] * this._options["threads_per_core"];
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
