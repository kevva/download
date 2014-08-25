'use strict';

var fs = require('fs');
var assign = require('object-assign');
var events = require('events');
var util = require('util');
var path = require('path');
var _ = require('underscore');
var request = require('request');
var DownloadWorker = require('./downloadWorker');
var Segment = require('./downloadSegment');


function DownloadJob(url, name, dest, opts){


    events.EventEmitter.call(this);


	this.url = url;
	this.opts = opts || {};
	this.dest = path.resolve(path.normalize(dest));
	this.name = name;
	this.segments = [];
	this.downloadWorkers = [];
    this.totalLength = 0;
	this.contentType = '';
	this.state = 'New';
	this.serverAcceptRange = false;
    this.finished = false;

	if(name.length > 0 && name.lastIndexOf('.') >= 0){

        this.fileName = name.substring(0, name.lastIndexOf('.'));

    }else{

        this.fileName = tempFileName;
    }

	this.fileExtension = name.substring(name.lastIndexOf('.'));

	this.maxConnectionsCount = opts.maxConnectionsCount || 4;
}


util.inherits(DownloadJob, events.EventEmitter);

DownloadJob.prototype.getFileMetadata = function(cb){

    cb = (cb && typeof cb === 'function')? cb : function () {};

    var self = this;

    console.log('Getting File Metadata..');

    try{

        if(self.url){

            var resHandler = function(error, res, body){

                if(!error && !(res.statusCode < 200 || res.statusCode >= 300)){

                    var headers = res.headers;


                    self.totalLength = parseInt(headers['content-length'] || '0');
                    self.contentType = headers['content-type'] || '';
                    self.serverAcceptRange = (headers['accept-ranges'] && headers['accept-ranges'] === 'bytes')? true : false;

                    console.log('TOTAL LENGTH: ' + self.totalLength + 'Bytes');
                    console.log('CONTENT TYPE: ' + self.contentType);

                    cb();

                }else{

                    if(!error)
                        var error = {message: 'Unable to get file metadata', statusCode: res.statusCode};

                    console.log('Unable to get file metadata');
                    cb(error);
                }

            };


            var optsWithUrl = assign({}, {url: self.url}, self.opts);

            request.head(optsWithUrl, resHandler);

        }

    }catch(error){

        console.log('Unable to get file metadata');

        cb(error);
    }
};


DownloadJob.prototype.start = function(cb){

    cb = (cb && typeof cb === 'function')? cb : function () {};

    var self = this;

    if(self.state === 'New'){

        if(!self.url){

            cb('There is not valid URL.');

            return;
        }

        self.getFileMetadata(function(error)
                {
                    self.state = 'Ready';
                    self.start(cb);
                });

    }else{




        if(fs.existsSync(self.getFullPath())){

            console.log(path.basename(self.dest) + ' already exists.');

            var fileExistAction = (self.opts.fileExistAction)? self.opts.fileExistAction : 'OVERWRITE';
            fileExistAction = fileExistAction.toUpperCase();

            switch(fileExistAction){

                case 'SKIP':
                console.log('File donwload is skipped.');
                self.emit('fileSkip');

                case 'RENAME':
                self._renameFile();
                console.log('The file is renamed to: ' + path.basename(self.dest));
                case 'OVERWRITE':
                default:

                if(fileExistAction === 'OVERWRITE')
                    console.log('Overwriting the file.');

                self._allocateFileSpace(function(error){

                    if(!error){
                        self._startNewConnection();
                    }

                });
            }

        }else{

                self._allocateFileSpace(function(error){
                    if(!error){
                        self._startNewConnection();
                    }
                });
        }
    }

    this.emit('start');

    return this;

};


DownloadJob.prototype._renameFile = function(){

    var self = this;

    var newFileName = '';
    var counter = 1;

    do{

        newFileName = self.fileName + ' (' + counter + ')' + self.fileExtension;
        counter++;

    }while(fs.existsSync(path.join(self.dest, newFileName)));

    self.name = newFileName;

}

DownloadJob.prototype._startNewConnection = function(){

    var self = this;

    console.log('');
    console.log('starting new connection');

    var startConnection = function(segment){

        segment.assigned = true;

        var stream = fs.createWriteStream(self.getFullPath(), {'flags': 'r+', 'start': segment.offset + segment.downloadedLength });

        var opts = assign({}, self.opts, {serverAcceptRange : self.serverAcceptRange});

        var dlWorker = new DownloadWorker(segment, self.url, stream, opts);

        //Register worker listeners

        dlWorker.on('error', function(error){

            self._onWorkerError(this, error);

        })

        .on('finish', function(){

            self._onWorkerFinish(this);

        })

        .on('pause', function(){

            self._onWorkerPause(this);

        })

        .on('start', function(){

            self._onWorkerStart(this);
        })

        .on('response', function(res){

            self.emit('response', res);

        });


        self.downloadWorkers.push(dlWorker.start());

    };



    var segment = self._getUnassignedSegment() || self.addSegment();

    if(segment){

        startConnection(segment);
    }
};

DownloadJob.prototype._getUnassignedSegment = function(){

    var self = this;

    //Return largest un assigned segment if available
    return _.chain(self.segments)
        .where({'finished': false, 'assigned': false})
        .sortBy(function(segment){ return segment.getRemainingLength();})
        .last()
        .value();

}

DownloadJob.prototype._onWorkerError = function(worker, error){

    var self = this;

    worker.segment.assigned = false;

    var workerIndex = self.downloadWorkers.indexOf(worker);

    if(workerIndex >= 0){
        self.downloadWorkers.splice(workerIndex, 1);
    }

    //Start new connection if required
    if(self._isFinished()){

        self._finish();

    }else if(self.serverAcceptRange && self.downloadWorkers.length < self.maxConnectionsCount && (self.opts.accelerate === undefined || self.opts.accelerate)){
       //Start new connection
       self._startNewConnection();
    }


};

DownloadJob.prototype._onWorkerFinish = function(worker){

    var self = this;

    worker.segment.finished = true;
    worker.segment.assigned = false;

    var workerIndex = self.downloadWorkers.indexOf(worker);

    //Remove download worker for the workers list
    if(workerIndex >= 0){
        self.downloadWorkers.splice(workerIndex, 1);
    }

    //Start new connection if required
    if(self._isFinished()){
        self._finish();

    }else if(self.serverAcceptRange && self.downloadWorkers.length < self.maxConnectionsCount && (self.opts.accelerate === undefined || self.opts.accelerate)){

       //Start new connection
       self._startNewConnection();
    }

};


DownloadJob.prototype._onWorkerPause = function(worker){



};

DownloadJob.prototype._onWorkerStart = function(worker){

    var self = this;

    if(self._isFinished()){

        self._finish();

    }else if(self.serverAcceptRange && self.downloadWorkers.length < self.maxConnectionsCount && (self.opts.accelerate === undefined || self.opts.accelerate)){
       //Start new connection
       self._startNewConnection();
    }


};

DownloadJob.prototype.pause = function(){


    this.downloadWorkers.forEach(function(worker){
        worker.pause();
    });

    this.emit('pause');
    return this;
};

DownloadJob.prototype.resume = function(){

    this.downloadWorkers.forEach(function(worker){
        worker.resume();
    });

    this.emit('resume');
    return this;
};

DownloadJob.prototype.cancel = function(){

    this.downloadWorkers.forEach(function(worker){
        worker.cancel();
    });

    this.emit('cancel');
    return this;
};

DownloadJob.prototype._isFinished = function(){

    var finished = true;

    this.segments.every(function(segment){
        if(segment.finished === false){
            finished = false;
            return finished;
        }else{
            return true;
        }
      });

  return finished;

};

DownloadJob.prototype._finish = function(){

    var self = this

    self.finished = true;
    self.emit('finish');

}

DownloadJob.prototype.getFullPath = function(){

    return path.join(this.dest, this.name);
};

DownloadJob.prototype.addSegment = function(){

    var self = this;

    console.log('Adding new segment');


    //if there is no segment add new one, otherwise get the largest unfinished segment and split it

    if(self.segments.length === 0){

         var newSegment = new Segment(0, self.totalLength);
         self.segments.push(newSegment);
         self.emit('addSegment', newSegment);

         console.log('A new segment is added');
         console.log('Segment length: ' + newSegment.length + 'Bytes');

         return newSegment;

    }else{

        //getting the largest segment
        var largestSegment = _.chain(self.segments)
        .where({'finished': false})
        .sortBy(function(segment){ return segment.getRemainingLength();})
        .last()
        .value();

        var minSegmentSize = self.opts.minSegmentSize || 1024 * 250;

        if(largestSegment && largestSegment.getRemainingLength() > minSegmentSize){

            var currentSegmentNewRemaning = Math.ceil(largestSegment.getRemainingLength()/ 2);

            var newSegmentLength = largestSegment.getRemainingLength() - currentSegmentNewRemaning;

            largestSegment.length = largestSegment.downloadedLength + currentSegmentNewRemaning;

            var newSegmentOffset = largestSegment.offset + largestSegment.length;

            var newSegment = new Segment(newSegmentOffset, newSegmentLength);

            self.segments.push(newSegment);

            self.emit('addSegment', newSegment);

            console.log('A new segment is added');
            console.log('Segment length: ' + newSegment.length);

            return newSegment;

        }else{

            return null;
        }
    }
};


DownloadJob.prototype._allocateFileSpace = function(cb){

    var self = this;

    try{

        var bytesWritten = 0;

        var fileStream = fs.createWriteStream(self.getFullPath(), {'flags': 'w', 'mode': self.opts.mode });

        var writeBuffer = new Buffer(1024 * 1024 * 5);
        writeBuffer.fill(0);
        var streamNeedDrain = false;

        //Filling the file with zeros
        var write = function(){

            while(bytesWritten < self.totalLength && !streamNeedDrain){

                //verify the buffer length and make sure it doesn't exceed the file size
                if(bytesWritten + writeBuffer.length <= self.totalLength){
                    streamNeedDrain = !(fileStream.write(writeBuffer, 'binary', null));
                    bytesWritten += writeBuffer.length;

                }else{

                    //Reach end of file, take slice of the buffer
                    var sliceLength = (self.totalLength - bytesWritten);

                    streamNeedDrain = !(fileStream.write(writeBuffer.slice(0, sliceLength), 'binary', null));
                    bytesWritten += sliceLength;

                }

                //Pause when write stream needs to drain the buffer
                if(streamNeedDrain){

                    //resume when the stream finished draining the buffer
                    fileStream.once('drain', resumeWriting);
                }
            }

            if(bytesWritten === self.totalLength)
                fileStream.end();
        };


        var resumeWriting = function(){
            streamNeedDrain = false;
            write();
        };

        var finish = function(){
            cb();
        };

        fileStream.once('finish', finish);

        console.log('Allocating file space...');

        write();

    }catch(error){

        fileStream && fileStream.close();
        cb(error);
    }
};

module.exports = DownloadJob;