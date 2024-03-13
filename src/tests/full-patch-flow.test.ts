import { MDFDataObject, MDFObjectComparator, MDFPatch, createMDFDataForFolder, createZipPatchFile, generatePatchFilePath, patchFromFolder, unzipPatchFile } from "../PatchSystem";
import { TestFolder, compareFileChunkByChunk } from "./test-setup";
import { join } from "path";

test("Patch folder correctly", async ()=>{
    //Setup
    const TEST_FOLDER_ROOT_PATH_1 = "../rootFolder1";
    const TEST_FOLDER_ROOT_PATH_2 = "../rootFolder2";
    let testFolder1:TestFolder;
    let testFolder2:TestFolder;
    const outputPath:string = generatePatchFilePath();
    let mdfDataArr1:MDFDataObject;
    let mdfDataArr2:MDFDataObject;
    let comparator:MDFObjectComparator;
    let patch:MDFPatch;

    testFolder1=new TestFolder(TEST_FOLDER_ROOT_PATH_1);
    testFolder2=new TestFolder(TEST_FOLDER_ROOT_PATH_2);
    testFolder1.createBaseFolderAndFiles();
    testFolder2.createBaseFolderAndFiles();
    
    testFolder2.createFolderAndFileInsideTestFolder();
    testFolder2.updateFileInsideTestFolder();
    testFolder2.removeSubFolderAndFilesFromTestFolder();
    
    mdfDataArr1=createMDFDataForFolder(TEST_FOLDER_ROOT_PATH_1);
    mdfDataArr2=createMDFDataForFolder(TEST_FOLDER_ROOT_PATH_2);
    
    comparator = new MDFObjectComparator(mdfDataArr2, mdfDataArr1);
    patch = comparator.compare();
    await createZipPatchFile(patch, outputPath);

    const outputFolderPath = await unzipPatchFile(outputPath, true);

    //removes patch folder after patching
    patchFromFolder(outputFolderPath, TEST_FOLDER_ROOT_PATH_1);

    //Compare files content from both target and destination and they should be the same
    const mdfDataArr3 = createMDFDataForFolder(TEST_FOLDER_ROOT_PATH_1);
    const dataRecentPaths = mdfDataArr2.data.map((v)=>v[0]);
    const dataPatchedPaths = mdfDataArr3.data.map((v)=>v[0]);

    //Create mdfpatch for patched folder to see if its the same
    expect(JSON.stringify(dataRecentPaths)).toEqual(JSON.stringify(dataPatchedPaths));
    dataPatchedPaths.forEach(async (filePath,i)=>{

        const recentFilePath = join(mdfDataArr2.rootPath, filePath);
        const patchedFilePath = join(mdfDataArr3.rootPath, filePath);

        const isEqual = await compareFileChunkByChunk(recentFilePath, patchedFilePath);
        expect(isEqual).toBeTruthy();
        const isLastIteration = i===dataPatchedPaths.length-1;
        if(isLastIteration){
            testFolder1.removeTestFolder();
            testFolder2.removeTestFolder();
        }
    });
});