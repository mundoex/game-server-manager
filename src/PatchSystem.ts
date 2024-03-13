import { statSync, readdirSync, createWriteStream, createReadStream, readFileSync, mkdirSync, renameSync, unlinkSync, rmSync, writeFileSync } from "fs";
import { join, basename, sep, relative, resolve } from "path";
import { Extract } from "unzipper"
import { ZipWrapper } from "./ZibWrapper";

const SEPARATOR = sep;

/*
Patch System based on modified date of file and not version
Because we dont have "versions" we can't compare both a create a patch file
So we instead create and compare a MDFData -> [filePath, modifiedAt]
Creates files if recent has new file and old is missing
Replaces files if recent has higher modified date than old
Deletes files if recent doesn't have a file and old has
*/

export const PATCH_JSON_FILE_NAME = "mdfpatch.json";

//[<file-name>, <modified-at-date>]
export type MDFData = [string, number];

//filePath -> current file name
//correspondingFileName -> temp file name
export interface MDFEntry{
    filePath:string;
    correspondingFileName?:string;
}

export interface MDFDataObject{
    rootPath:string;
    data:Array<MDFData>;
}

export interface MDFPatch{
    oldRootPath:string;
    recentRootPath:string;
    create:MDFEntry[];
    update:MDFEntry[];
    delete:MDFEntry[];
}

//recursively iterate through all files in a DFS, we use mdfDataArray as optional for recursion
export function createMDFDataForFolder(baseFolderPath:string, rootPath?:string, mdfDataArr:Array<MDFData>=[]):MDFDataObject{
    const files=readdirSync(baseFolderPath);
        
    files.forEach((file:string) => {
        const filePath=join(baseFolderPath, file);
        const stats=statSync(filePath);
        rootPath = rootPath ? rootPath : baseFolderPath;
        if (stats.isDirectory()) {
            createMDFDataForFolder(filePath, rootPath, mdfDataArr);
        } else {
            mdfDataArr.push([relative(rootPath, filePath), stats.mtime.getTime()]);
        }
    });
    return {rootPath: resolve(rootPath) , data:mdfDataArr};
}

function createMDFEntry(filePath:string, fileIndex?:number){
    return (fileIndex!==null && fileIndex!==undefined) ? { filePath, correspondingFileName:`${fileIndex}-${basename(filePath)}`} : { filePath }
}

export function generatePatchFilePath(){
    return `./${new Date().getTime()}-patch.zip`;
}

//create zip file with all required files and MDFPatch file
export async function createZipPatchFile(mdfPatch:MDFPatch, outputPath:string=generatePatchFilePath()) : Promise<string>{
    const outputZipStream = createWriteStream(outputPath);
    const zipWrapper = new ZipWrapper('zip', { zlib: { level: 9 }}, outputZipStream);

    mdfPatch.create.forEach((createEntry)=> {
        const fullFilePath = join(mdfPatch.recentRootPath, createEntry.filePath);
        const readStream = createReadStream(fullFilePath);
        zipWrapper.archive.append(readStream, {name: createEntry.correspondingFileName});
    });

    mdfPatch.update.forEach((updateEntry)=> {
        const fullFilePath = join(mdfPatch.recentRootPath, updateEntry.filePath);
        const readStream = createReadStream(fullFilePath);
        zipWrapper.archive.append(readStream, {name: updateEntry.correspondingFileName});
    });

    zipWrapper.archive.append(JSON.stringify(mdfPatch), {name: PATCH_JSON_FILE_NAME});

    await zipWrapper.archive.finalize();
    return outputPath;
}

//create a folder in same dir from zip with all required files and MDFPatch file
export async function unzipPatchFile(zipPath:string, removeZipFile:boolean=false) : Promise<string>{
    const resolvedPath = resolve(zipPath);
    const readStream = createReadStream(resolvedPath);
    const unzippedFolderName = basename(resolvedPath).split(".").shift();
    await readStream.pipe(Extract({ path: unzippedFolderName })).promise();
    if(removeZipFile) unlinkSync(zipPath);
    const outputFolderPath = join(resolvedPath.split(SEPARATOR).slice(0,-1).join(SEPARATOR), unzippedFolderName);
    return outputFolderPath;
}

export function patchFromFolder(patchFolderPath:string, targetFolderPath:string, keepPatchFolder:boolean=false){
        //check if for file the folder needs to be created
        const mdfPatchFile=readFileSync(join(patchFolderPath, PATCH_JSON_FILE_NAME));
        const mdfPatch:MDFPatch=JSON.parse(mdfPatchFile.toString());
        
        //create
        mdfPatch.create.forEach((createEntry:MDFEntry)=>{
            const folderPathToCreate = createEntry.filePath.split(SEPARATOR).slice(0,-1).join(SEPARATOR);
            const newFolderToCreate = join(targetFolderPath,folderPathToCreate);
            mkdirSync(newFolderToCreate, {recursive:true});
            const sourceFilePath = join(patchFolderPath, createEntry.correspondingFileName);
            const targetFilePath = join(mdfPatch.oldRootPath, createEntry.filePath);
            if(keepPatchFolder){
                createReadStream(sourceFilePath).pipe(createWriteStream(targetFilePath));
            }else{
                writeFileSync(targetFilePath,"");   //create empty file to replace contents with
                renameSync(sourceFilePath,targetFilePath);
            }
        });

        //update
        mdfPatch.update.forEach((updateEntry:MDFEntry)=>{
            const sourceFilePath = join(patchFolderPath, updateEntry.correspondingFileName);
            const targetFilePath = join(mdfPatch.oldRootPath, updateEntry.filePath);
            if(keepPatchFolder){
                createReadStream(sourceFilePath).pipe(createWriteStream(targetFilePath))
            }else{
                renameSync(sourceFilePath,targetFilePath);
            }
        });

        //delete
        mdfPatch.delete.forEach((deleteEntry:MDFEntry)=>{
            const targetFilePath = join(mdfPatch.oldRootPath, deleteEntry.filePath);
            unlinkSync(targetFilePath);
        });

        //find empty folders
        const possibleEmptyFolders = new Set<string>();

        mdfPatch.delete.map((deleteEntry:MDFEntry)=>{
            const targetFilePathsArr = join(mdfPatch.oldRootPath, deleteEntry.filePath).split(SEPARATOR).slice(0,-1);
            const subfolders = [];
            for (let i = 0; i < targetFilePathsArr.length; i++) {
                const subfolderPath = targetFilePathsArr.slice(0, i + 1).join('/');
                subfolders.push(subfolderPath);
                possibleEmptyFolders.add(subfolderPath);
            }
        });

        //clean up empty folders
        Array.from(possibleEmptyFolders.values()).forEach((possibleEmptyFolderPath:string)=>{
            const isEmpty = readdirSync(possibleEmptyFolderPath).length===0;
            if(isEmpty){
                rmSync(possibleEmptyFolderPath,{recursive:true});
            }
        });

        //cleanup patch folder
        if(!keepPatchFolder){
            rmSync(patchFolderPath, {recursive:true});
        }
}
    
export class MDFObjectComparator{
    recentMDFObj:MDFDataObject;
    oldMDFObj:MDFDataObject;
    private _cachedRecentMDFMap:Map<string,number>;
    private _cachedOldMDFMap:Map<string,number>;
    
    constructor(recentMDFObj:MDFDataObject, oldMDFObj:MDFDataObject){
        this.recentMDFObj=recentMDFObj;
        this.oldMDFObj=oldMDFObj;
        this._cachedRecentMDFMap=new Map<string,number>(recentMDFObj.data);
        this._cachedOldMDFMap=new Map<string,number>(oldMDFObj.data);
    }
    
    compare() : MDFPatch{
        const mdfResult:MDFPatch={ 
            oldRootPath: this.oldMDFObj.rootPath, 
            recentRootPath: this.recentMDFObj.rootPath, 
            create:[], update:[], delete:[]
         };
        //Used to check if there is files on the old folder that needs to be deleted
        const oldMissingCheckedSet=new Set<string>(this._cachedOldMDFMap.keys());

        let fileIndex=0;
        this._cachedRecentMDFMap.forEach((newModifiedAt,newFilePath)=>{
            const oldModifiedAt = this._cachedOldMDFMap.get(newFilePath);
            if(oldModifiedAt){
                if(newModifiedAt!==oldModifiedAt){
                    const entry=createMDFEntry(newFilePath, fileIndex);
                    mdfResult.update.push(entry);
                }
                oldMissingCheckedSet.delete(newFilePath);
            }else{
                const entry=createMDFEntry(newFilePath, fileIndex);
                mdfResult.create.push(entry);
            }
            fileIndex++;
        });
        const filePathsToDelete=Array.from(oldMissingCheckedSet.keys()).map((key)=>createMDFEntry(key));
        mdfResult.delete=filePathsToDelete;
        return mdfResult;
    }
}
