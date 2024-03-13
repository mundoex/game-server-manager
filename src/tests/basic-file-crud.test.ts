import { existsSync, statSync } from "fs";
import { join } from "path";
import { TestFolder } from "./test-setup";

const TEST_FOLDER_ROOT_PATH = "../rootFolder"
let testFolder:TestFolder;

beforeEach(()=>{
    testFolder=new TestFolder(TEST_FOLDER_ROOT_PATH);
    testFolder.createBaseFolderAndFiles();
});

afterEach(()=>{
    testFolder.removeTestFolder();
});

describe("Basic file CRUD operations Tests", ()=>{
    test("Created test folder", ()=>{
        expect(existsSync(TEST_FOLDER_ROOT_PATH)).toBe(true);
    });
    
    test("Create folder inside test folder", ()=>{
        testFolder.createFolderAndFileInsideTestFolder();
    
        expect(existsSync(testFolder.testFolder3Path)).toBe(true);
        expect(existsSync(join(testFolder.testFolder3Path, 'startup.bat'))).toBe(true);
    });
    
    test("Update file inside test folder", ()=>{
        const startModifiedTime = statSync(testFolder.testReadmePath).mtime.getTime();
        testFolder.updateFileInsideTestFolder();
        const currentModifiedTime = statSync(testFolder.testReadmePath).mtime.getTime();
    
        expect(startModifiedTime).toBeLessThan(currentModifiedTime);
    });
    
    test("Remove folder and file inside test folder", ()=>{
        testFolder.removeSubFolderAndFilesFromTestFolder();
        expect(existsSync(testFolder.testSubFolder1Path)).toBe(false);
    });
});