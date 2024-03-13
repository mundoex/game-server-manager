import { createMDFDataForFolder } from "../PatchSystem";
import { TestFolder } from "./test-setup";

const TEST_FOLDER_ROOT_PATH_1 = "../rootFolder1";
const TEST_FOLDER_ROOT_PATH_2 = "../rootFolder2";
let testFolder1:TestFolder;
let testFolder2:TestFolder;

beforeEach(()=>{
    testFolder1=new TestFolder(TEST_FOLDER_ROOT_PATH_1);
    testFolder2=new TestFolder(TEST_FOLDER_ROOT_PATH_2);
    testFolder1.createBaseFolderAndFiles();
    testFolder2.createBaseFolderAndFiles();
});

afterEach(()=>{
    testFolder1.removeTestFolder();
    testFolder2.removeTestFolder();
});

describe("MDF Tests", ()=>{
    test("Created MDFDataObj", ()=>{
        const MDFDataObj1=createMDFDataForFolder(TEST_FOLDER_ROOT_PATH_1);
        expect(MDFDataObj1.data.length).toBeGreaterThan(0);
    });

    test("Created different MDFData Array", ()=>{
        testFolder2.createFolderAndFileInsideTestFolder();
        testFolder2.updateFileInsideTestFolder();
        testFolder2.removeSubFolderAndFilesFromTestFolder();

        const MDFDataObj1=createMDFDataForFolder(TEST_FOLDER_ROOT_PATH_1);
        const MDFDataObj2=createMDFDataForFolder(TEST_FOLDER_ROOT_PATH_2);

        expect(MDFDataObj1.data.length).toBeGreaterThan(0);
        expect(MDFDataObj2.data.length).toBeGreaterThan(0);

        expect(JSON.stringify(MDFDataObj1)).not.toMatch(JSON.stringify(MDFDataObj2));
        expect(JSON.stringify(MDFDataObj2)).toMatch(/startup/);
    });
    
});