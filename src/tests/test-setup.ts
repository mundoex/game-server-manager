import { mkdirSync, writeFileSync, rmSync, createReadStream } from "fs"
import { join } from "path";

export class TestFolder{
    rootPath:string;
    testFolder1Path:string;
    testSubFolder1Path:string;
    testFolder2Path:string;
    testFolder3Path:string;
    testReadmePath:string;

    constructor(rootPath:string){
        this.rootPath=rootPath;
        this.testFolder1Path=join(rootPath, 'folder1');
        this.testSubFolder1Path=join(rootPath, 'folder1','subfolder1');
        this.testFolder2Path=join(rootPath, 'folder2');
        this.testFolder3Path=join(rootPath, 'folder3');
        this.testReadmePath=join(rootPath, 'README.md');
    }

    createBaseFolderAndFiles(){
        // Create root folder
        mkdirSync(this.rootPath);

        // Create README.md
        const readmeContent = '# Project\n\nThis is a sample project.';
        writeFileSync(this.testReadmePath, readmeContent);

        // Create file001.txt in the root folder
        writeFileSync(join(this.rootPath, 'file001.txt'), 'Content of file001.txt');

        // Create folder1
        mkdirSync(this.testFolder1Path);

        // Create file011.txt and file012.txt in folder1
        writeFileSync(join(this.testFolder1Path, 'file011.txt'), 'Content of file011.txt');
        writeFileSync(join(this.testFolder1Path, 'file012.txt'), 'Content of file012.txt');

        // Create subfolder1
        mkdirSync(this.testSubFolder1Path);

        // Create file111.txt and file112.txt in subfolder1
        writeFileSync(join(this.testSubFolder1Path, 'file111.txt'), 'Content of file111.txt');
        writeFileSync(join(this.testSubFolder1Path, 'file112.txt'), 'Content of file112.txt');

        // Create folder2
        mkdirSync(this.testFolder2Path);

        // Create file021.txt and file022.txt in folder2
        writeFileSync(join(this.testFolder2Path, 'file021.txt'), 'Content of file021.txt');
        writeFileSync(join(this.testFolder2Path, 'file022.txt'), 'Content of file022.txt');
    }

    removeTestFolder(){
        rmSync(this.rootPath, { recursive: true });
    }

    //create folder3
    createFolderAndFileInsideTestFolder(){
        mkdirSync(this.testFolder3Path);
        writeFileSync(join(this.testFolder3Path, 'startup.bat'), "echo bat shit crazy script");
    }

    //update readme.md
    updateFileInsideTestFolder(){
        writeFileSync(join(this.rootPath, 'README.md'), "This is a change to the readme file");
    }

    //delete subfolder1
    removeSubFolderAndFilesFromTestFolder(){
        rmSync(this.testSubFolder1Path, {recursive:true}); 
    }
}

export async function compareFileChunkByChunk(path1:string, path2:string, bufferSize:number=64 * 1024){
    let chunksStillEqual:number=1;  //use 1 as boolean for true
    let streamsCompleted=0;

    const onStreamEnd = (resolve: (value: number | PromiseLike<number>) => void)=>{
        streamsCompleted++;
        if(streamsCompleted===2) resolve(chunksStillEqual);
    }

    const stream1 = createReadStream(path1, {highWaterMark: bufferSize});
    const stream2 = createReadStream(path2, {highWaterMark: bufferSize});

    const compareFilesPromise = new Promise<number>((resolve, reject) => {
        stream1.on("end", ()=>{
            onStreamEnd(resolve);
        });
        stream2.on("end", ()=>{
            onStreamEnd(resolve);
        });

        stream1.on("close", ()=>{
            onStreamEnd(resolve);
        });
        stream2.on("close", ()=>{
            onStreamEnd(resolve);
        });

        let i1:number=0,i2:number=0;
        let c1:Buffer=null,c2:Buffer=null;

        //stream 1
        stream1.on("data", (chunk1:Buffer)=>{
            c1=chunk1;
            i1++;
            if(stream2.isPaused()) stream2.resume();
            stream1.pause();
        });

        stream1.on("pause",()=>{
            if(i1===i2){
                chunksStillEqual&=Number(c1.equals(c2));
                if(chunksStillEqual){
                    stream1.resume();
                    stream2.resume();
                }else{
                    stream1.emit("end");
                    stream2.emit("end");
                }
            }
        });

        //stream 2
        stream2.on("data", (chunk2:Buffer)=>{
            c2=chunk2;
            i2++;
            if(stream1.isPaused()) stream1.resume();
            stream2.pause();
        });

        stream2.on("pause",()=>{
            if(i1===i2){
                chunksStillEqual&=Number(c1.equals(c2));
                if(chunksStillEqual){
                    stream1.resume();
                    stream2.resume();
                }else{
                    stream1.emit("end");
                    stream2.emit("end");
                }
            }
        });
    });

    const result = await compareFilesPromise;
    stream1.close();
    stream2.close();
    return Boolean(result);
}
