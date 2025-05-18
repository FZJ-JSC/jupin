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

import fs from 'fs'
import { Validator } from './Validator.js';
import {getOptions, createTasksFromFile} from './main.js';
import {getCalcPinning} from './utils.js';

let data = {
	equal: new Array(),
	unequal: new Array(),
	unknown: new Array()
};

let dirname = process.argv[2];
let error = comparePinning(dirname);
if (error)
    process.exit(1);

/**
* Compares the pinning in each file of a specific directory with the calculated/simulated pinning
*/
function comparePinning(dirname) {
	let files = fs.readdirSync(dirname);
	let error = false;

	for (let file of files) {
		let options = getOptions(file);
		let real_pinning = getRealPinning(options, dirname, file);
		let validator = new Validator(options);

		// Test if the simulated pinning for the used options is implemented
		if (!validator.isImplemented()) {
			console.warn('\x1b[33m%s\x1b[0m', file+": pinning is not implemented");
			data["unknown"].push(file);
		} else {
			let calc_pinning = getCalcPinning(options);
			if (isDifferent(real_pinning, calc_pinning, options)) {
				console.error('\x1b[31m%s\x1b[0m', file+": pinning is unequal");
				data["unequal"].push(file);
				error = true;
			} else {
				console.log(file+": pinning is equal");
				data["equal"].push(file);
			}
		}
	}
	console.table({
		"equal": data["equal"].length, 
		"unequal": data["unequal"].length, 
		"not implemented": data["unknown"].length
	});

	// Write results into a JSON file
	data = JSON.stringify(data, null, 2);
	fs.writeFileSync('results.json', data);
	return error;
}

/**
 * Reads the pinning from a given file and generates the corresponding pinning mask
 */
function getRealPinning(options, dirname, filename) {
	let text = fs.readFileSync(dirname + filename);
	text = text.toString();
	let file_array = text.split("\n");
	for(let i = 0; i < file_array.length-1; i++) {
		file_array[i] = file_array[i].trim().split(/\s+/);
	}

	return createTasksFromFile(file_array, options);
}

/**
 * Checks if the real and calculated pinning masks are different
 */
function isDifferent(real_pinning, calc_pinning, options) {
	let outer_level = (options["mode"] === "node") ? options["nodes"] : options["task"];
	for(let i=0; i<outer_level; i++) {
		for(let j=0; j<options["numa_sockets"]; j++) {
			for(let k=0; k<options["threads"]; k++) {
				for(let l=0; l<options["cores"]; l++) {
					if (real_pinning[i][j][k][l] !== calc_pinning[i][j][k][l]) return true;
				}
			}
		}
	}
	return false;
}
