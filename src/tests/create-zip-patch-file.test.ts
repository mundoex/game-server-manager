import { existsSync, unlinkSync } from "fs";
import { MDFDataObject, MDFObjectComparator, MDFPatch, createMDFDataForFolder, createZipPatchFile, generatePatchFilePath } from "../PatchSystem";
import { TestFolder } from "./test-setup";
import {  resolve } from "path";

test("Create zip patch file with correct files inside", async ()=> {
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
    const created = existsSync(outputPath);

    //Clean up
    unlinkSync(resolve(outputPath));
    testFolder1.removeTestFolder();
    testFolder2.removeTestFolder();

    //Test
    expect(created).toBe(true);
});