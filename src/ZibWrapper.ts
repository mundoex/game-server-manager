import archiver from "archiver";

/*
    Created this Wrapper class to fix archive.finalize() not having finished streaming everything
    https://github.com/archiverjs/node-archiver/issues/476#issuecomment-1792896115
*/
export class ZipWrapper{
    archive:archiver.Archiver
    writeableStream:NodeJS.WritableStream;
    constructor(format:archiver.Format, options:archiver.ArchiverOptions, destination:NodeJS.WritableStream,){
        this.writeableStream = destination;
        
        //fix archive.finalize() not having finished streaming everything
        const archive = archiver(format, options);
        const thisArchive = archive;
        const streamingCompletedPromise = new Promise<void>((resolve, reject) => {
            this.writeableStream.on('close', () => resolve()); // the stream previously defined
            thisArchive.on('error', (err: Error) => reject(err));
        });
        const originalArchiverFinalize = archive.finalize;
        archive.finalize = async () => {
            await originalArchiverFinalize.call(thisArchive);
            await streamingCompletedPromise;
        };
        this.archive = archive;
        this.archive.pipe(this.writeableStream);
    }
}