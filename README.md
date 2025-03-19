# JuPin
JuPin [yo͞o pin] is a set of tools for process pinning/affinity on High Performance Computers (HPC) consisting of two interrelated components:
1. A web-based visualisation 
2. Automatic verification 

The web-based visualisation is aimed at the users of an HPC as it shows the actual mapping of application tasks and threads to the hardware threads of the selected system based on configurable options. The mapping is done by re-implementing the actual behaviour on the HPC system in Javascript, so it can work in a web browser without accessing the HPC system itself. For this reason, users can play with the various options in the web interface to get an idea of what will happen on the HPC when they run jobs with these options.
The automatic verification component, on the other hand, has two functions that help JuPin tool developers and HPC system providers. It is used to compare the re-implemented pinning mapping with the actual pinning on the HPC systems by executing an extended version of a hybrid C++ MPI-OpenMP-Helloworld program via a GitLab CI pipeline. This functionality guarantees the correctness of the reimplementation shown in the visualisation feature, and can also be used to compare with new versions of the workload manager, e.g. on a test system, to see if anything has changed. This helps the HPC centre to update its documentation accordingly and to provide proactive user support.
JuPin is being actively developed by the Jülich Supercomputing Centre (JSC) and is targeted at their current Slurm-managed HPC systems, but can also be configured and adapted to other system architectures and workload managers.

## User Documentation
### Using the web-based visualization
When you access the webpage for the Pinning-Process-Simulation, you will find all available configuration options on the left side of the tool. Once you modify the options, the pinning simulation on the right-hand side is automatically updated. If you decide to use the configuration in your Slurm jobs, you can simply copy the command line arguments from the gray-shaded box on the left.

### Using the automatic verification
To verify that your pinning configuration works as expected, start the CI/CD pipeline manually and wait for it to complete. A successful run confirms that the real pinning behavior matches the simulation. If the pipeline encounters discrepancies, it will fail and GitLab will send you a mail notification.

You have two options to view the results. Firstly, you can have a look at a short summary in the job log of the second job (named “compare_pinning”). Alternatively, a more detailed view is provided via the automatically generated GitLab pages. Each pinning setup is identified there by a compact abbreviation formatted as follows: 
```
    <system>-<nodes>-<tasks>-<cpuspertask>-<threadspercore>-<cpubind>-<node-distribution>-<socket-distribution>-<core-distribution>
```

If further manual testing is required, you can copy the Slurm command line arguments for the currently displayed pinning-setup from the gray-shaded box on the left.

## Developer Documentation
### Adding new systems
1. select an abbreviation for the system
2. `shared/javascripts/utils.js`: add the system to the object `supercomputer_attributes`
3. `webtool/index.html`: add a new option to the element with the ID `supercomputer`
4. `verification/index.html`: add a new `optgroup` to the element with the ID `file`
5. `verification/all_hello_reduced.xml`: add a new parameter named `system` within the parameter set `compile_param`, adjust the parameters `account` and `queue` of the parameterset `systemParameter` add tests for the new system
6. if necessary define the new system as a test system
7. use the pinning verification tool to check whether the simulation for the new system is correct

### Adding Tests for verification
`verification/all_hello_reduced.xml`: extend the parameters `i`, `tasks`, `threadspertask` and `tcp` of the parameter set `systemParameter`.

### Changing the Test-System
`.gitlab-ci.yml`: adapt the name of the job `generate_files_...`, change the tag to the desired system and replace the JUBE-tag for the system in the `jube run` command

### Changing the pinning calculation
The pinning calculation is managed by the `CPU_Bind` class, which implements the `getPinning()` method. Several subclasses extend `CPU_Bind` to perform pinning calculations for specific values of the `cpubind` option. Each of these subclasses must implement the `getCoreToBind()` method, which determines the binding for a particular thread. Any changes to the pinning logic should be tested with the Pinning-Verification-Tool to ensure accurate results.

### Possible issues
Error `maxJobsPerUser`: Adjust the parameter `max_async` in the `exe` step of the file `verification/all_hello_reduced.xml`
SymLinks not created because permission gets denied: `git config --edit` change core.symlinks to true, open a Terminal as an Administrator and execute the git checkout command
