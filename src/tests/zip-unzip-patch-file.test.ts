import { readdirSync, rmSync } from "fs";
import { MDFDataObject, MDFObjectComparator, MDFPatch, createMDFDataForFolder, createZipPatchFile, generatePatchFilePath, unzipPatchFile } from "../PatchSystem";
import { TestFolder } from "./test-setup";

test("Zip & Unzip patch into folder with correct files inside", async ()=>{
    //Setup
    const expectedFilesInside = [
        '0-file001.txt',
        '1-file011.txt',
        '2-file012.txt',
        '3-file021.txt',
        '4-file022.txt',
        '5-startup.bat',
        '6-README.md',
        'mdfpatch.json',
    ];

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

    const outputFolderPath = await unzipPatchFile(outputPath ,true);
    const filesInside = readdirSync(outputFolderPath);

    //Clean up
    rmSync(outputFolderPath, {recursive: true}); 
    testFolder1.removeTestFolder();
    testFolder2.removeTestFolder();
    
    //Test
    expect(filesInside).toEqual(expectedFilesInside);
});