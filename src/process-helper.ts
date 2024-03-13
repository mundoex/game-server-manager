const { snapshot } = require("process-list");
import byteSyze from "byte-size";
import { spawn } from "child_process";

export interface IProcessInfo {
    pid: number;        // process pid
    ppid: number;       // parent process pid
    name: string;       // process name (title)
    path: string;       // full path to the process binary file
    threads: number;     // threads per process
    owner: string;       // the owner of the process
    priority: number;    // an os-specific process priority
    cmdline: string;     // full command line of the process
    starttime: Date;     // the process start date / time
    vmem: string|number;        // virtual memory size in bytes used by process
    pmem: string|number;        // physical memory size in bytes used by process
    cpu: string|number;     // cpu usage by process in percent
    utime: string;       // amount of time in ms that this process has been scheduled in user mode
    stime: string;       // amount of time that in ms this process has been scheduled in kernel mode
}

export interface ITaskManagerSnapshotOptions{
    fields:string[];
    prettyMemory:boolean;
}

const ALL_PROCESS_PROPERTIES: string[] = [
    "name","pid","ppid","path","threads","owner","priority",
    "cmdline","starttime","vmem","pmem","cpu","utime","stime",
];

const STANDARD_PROCESS_PROPERTIES: string[] = [
    "name","pid","ppid","path","threads",
    "vmem","pmem","cpu",
];

export async function taskManagerSnapshot(options:ITaskManagerSnapshotOptions={fields:ALL_PROCESS_PROPERTIES, prettyMemory:false}) : Promise<IProcessInfo[]> {
    const tasks:{[key: string]:IProcessInfo} = await snapshot(...options.fields);
    const processesInfo:IProcessInfo[]=[];
    for (const key in tasks) {
        const task = tasks[key];
        const vmem = parseInt(<string>task.vmem);
        const pmem = parseInt(<string>task.pmem);
        processesInfo.push({...task,
            vmem: options.prettyMemory ? byteSyze(vmem).toString() : vmem,
            pmem: options.prettyMemory ? byteSyze(pmem).toString() : pmem,
            cpu: options.prettyMemory ? (<number>task.cpu).toFixed(2)+"%" : task.cpu,
        });
    }
    return processesInfo;
}

async function getProcessesInfoByName(name:string){
    const processesInfo = await taskManagerSnapshot({fields:ALL_PROCESS_PROPERTIES, prettyMemory:true});
    return processesInfo.find((pInfo)=>pInfo.name.includes(name));
}

function startProcess(path:string, args:string[]=[]){
    return spawn(path, args, { detached:true, stdio:"pipe" });
}
